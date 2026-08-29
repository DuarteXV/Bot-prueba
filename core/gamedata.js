export const PERSONAJES = {
  yuji: {
    nombre: "Yuji Itadori",
    generacion: "new_gen",
    precio: 120000,
    imagen: "https://cdn.dix.lat/me/0hdc_20260829-c91x-jdo5-fe64.jpg"
  },
  megumi: {
    nombre: "Megumi Fushiguro",
    generacion: "new_gen",
    precio: 135000,
    imagen: "https://cdn.dix.lat/me/f6ww_20260829-c91x-faxf-c0e1.jpg"
  },
  yuta: {
    nombre: "Yuta Okkotsu",
    generacion: "new_gen",
    precio: 150000,
    imagen: "https://cdn.dix.lat/me/icq7_20260829-c91x-u7r7-bb6c.jpg"
  },
  nanami: {
    nombre: "Kento Nanami",
    generacion: "old_gen",
    precio: 300000,
    imagen: "https://cdn.dix.lat/me/pfbr_20260829-c91x-8bxq-79ce.jpg"
  },
  geto: {
    nombre: "Suguru Geto",
    generacion: "old_gen",
    precio: 450000,
    imagen: "https://cdn.dix.lat/me/qmxi_20260829-c91x-p4p0-8c6b.jpg"
  },
  gojo: {
    nombre: "Satoru Gojo",
    generacion: "old_gen",
    precio: 700000,
    imagen: "https://cdn.dix.lat/me/czoi_20260829-c91x-k5en-fddf.jpg"
  }
};

export const ITEMS = {
  pala: { nombre: '🪏 Pala', precio: 500, poder: 10, tipo: 'arma' },
  pico: { nombre: '⛏️ Pico', precio: 1200, poder: 25, tipo: 'arma' },
  guantelete_maldito: { nombre: '🥊 Guantelete maldito', precio: 2200, poder: 45, tipo: 'arma' },
  amuleto_protector: { nombre: '📿 Amuleto protector', precio: 2800, poder: 55, tipo: 'armadura' },
  katana_maldita: { nombre: '🗡️ Katana maldita', precio: 3000, poder: 70, tipo: 'arma' },
  armadura_reforzada: { nombre: '🛡️ Armadura reforzada', precio: 4500, poder: 95, tipo: 'armadura' },
  cristal_dominio: { nombre: '💎 Cristal de dominio', precio: 8000, poder: 150, tipo: 'armadura' },
  manto_hechicero: { nombre: '🧥 Manto de hechicero grado 1', precio: 12000, poder: 220, tipo: 'armadura' },

  cuchillos_yuji: { nombre: '🔪 Cuchillos malditos de Sukuna', precio: 25000, poder: 300, tipo: 'arma', restriccion: 'yuji' },
  perro_divino: { nombre: '🐺 Perros Divinos (Shikigami)', precio: 28000, poder: 320, tipo: 'arma', restriccion: 'megumi' },
  rika_espada: { nombre: '⚔️ Rika - Espada del Rey de las Maldiciones', precio: 35000, poder: 400, tipo: 'arma', restriccion: 'yuta' },
  overtime_nanami: { nombre: '⏱️ Técnica Ratio - Horas Extra', precio: 60000, poder: 550, tipo: 'arma', restriccion: 'nanami' },
  utero_maldito: { nombre: '🩸 Útero Maldito - Cadáveres', precio: 90000, poder: 700, tipo: 'arma', restriccion: 'geto' },
  infinito_gojo: { nombre: '♾️ Infinito Ilimitado', precio: 150000, poder: 1000, tipo: 'armadura', restriccion: 'gojo' },
};

export function xpParaNivel(nivel) {
  return nivel * 500;
}

export function calcularPoder(personaje) {
  const nivelPoder = personaje.nivel * 20;
  const armaPoder = personaje.arma ? (ITEMS[personaje.arma]?.poder || 0) : 0;
  const armaduraPoder = personaje.armadura ? (ITEMS[personaje.armadura]?.poder || 0) : 0;
  return nivelPoder + armaPoder + armaduraPoder;
}