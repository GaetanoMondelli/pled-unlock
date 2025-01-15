import { NextApiRequest } from 'next';
import { NextResponse } from 'next/server'
interface User {
  id: number;
  username: string;
  password: string;
}

const users: User[] = [
  {
    id: 1,
    username: 'user1',
    password: 'password',
  },
];

function findUserByUsername(username: string): User | undefined {
  return users.find(user => user.username === username);
}

function validatePassword(user: User, password: string): boolean {
  return user.password === password;
}

export async function POST(request: Request) {
  console.log('POST request to /login');
  const req = await request.json()
  const { username, password } = req;

  console.log('username', username, password);

  const user = findUserByUsername(username);

  if (!user || !validatePassword(user, password)) {
    return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
  }

  return NextResponse.json({ message: 'Logged in' });
}
