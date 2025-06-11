// Simple authentication system that bypasses database completely
const validUsers = new Map([
  ['b.weinreder@nijhuis.nl', {
    id: 1,
    email: 'b.weinreder@nijhuis.nl',
    name: 'Bram Weinreder',
    role: 'admin',
    password: 'admin123'
  }]
]);

export function authenticateUser(email: string, password: string) {
  const user = validUsers.get(email);
  if (user && user.password === password) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
  }
  return null;
}

export function getUserById(id: number) {
  for (const [email, user] of validUsers) {
    if (user.id === id) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };
    }
  }
  return null;
}