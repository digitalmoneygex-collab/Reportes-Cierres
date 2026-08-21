const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUser(cedula, nombre, rol, password) {
  const email = `${cedula}@gex.com`;
  
  // 1. Crear en auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log(`El usuario con cedula ${cedula} ya existe en auth.`);
    } else {
      console.error(`Error creando auth user ${cedula}:`, authError.message);
      return;
    }
  }

  const userId = authData?.user?.id;
  if (!userId) {
     // Si ya existe, buscar su ID
     const { data: listData } = await supabase.auth.admin.listUsers();
     const existing = listData.users.find(u => u.email === email);
     if (existing) {
       await createProfile(existing.id, cedula, nombre, rol);
     }
     return;
  }

  await createProfile(userId, cedula, nombre, rol);
}

async function createProfile(id, cedula, nombre, rol) {
  const { error } = await supabase
    .from('usuarios')
    .upsert({
      id,
      cedula,
      nombre_completo: nombre,
      rol
    });

  if (error) {
    console.error(`Error creando perfil para ${nombre}:`, error.message);
  } else {
    console.log(`Perfil creado exitosamente para: ${nombre} (${rol})`);
  }
}

async function run() {
  console.log('Creando usuarios de prueba...');
  await createUser('24500123', 'Juan Pérez', 'CAJERO', '123456');
  await createUser('12345678', 'Administrador GEX', 'SUPERVISOR', 'Admin2024!');
  console.log('Finalizado.');
}

run();
