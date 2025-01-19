import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const jsonPath = path.join(process.cwd(), 'public', 'pled.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(jsonData);
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error reading JSON:', error);
    res.status(500).json({ message: 'Error reading JSON file' });
  }
} 