export const searchSections = [
  { label: 'Usuarios', table: 'profiles', fields: 'id,full_name,church_name', column: 'full_name', title: 'full_name', detail: 'church_name', path: '/admin/usuarios' },
  { label: 'Publicaciones', table: 'posts', fields: 'id,content,category', column: 'content', title: 'content', detail: 'category', path: '/admin/posts' },
  { label: 'Recursos', table: 'resources', fields: 'id,title,category', column: 'title', title: 'title', detail: 'category', path: '/admin/recursos' },
  { label: 'Sociedades', table: 'societies', fields: 'id,name,zone', column: 'name', title: 'name', detail: 'zone', path: '/admin/sociedades' },
  { label: 'Estudios', table: 'study_plans', fields: 'id,title', column: 'title', title: 'title', path: '/admin/estudios' },
];

export const searchPattern = value => `%${value.replace(/[\\%_]/g, character => `\\${character}`)}%`;
