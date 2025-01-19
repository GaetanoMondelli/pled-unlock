import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const jsonPath = path.join(process.cwd(), 'public', 'pled.json');
    const updatedData = JSON.stringify(req.body, null, 2);
    
    fs.writeFileSync(jsonPath, updatedData);
    
    res.status(200).json({ message: 'JSON updated successfully' });
  } catch (error) {
    console.error('Error saving JSON:', error);
    res.status(500).json({ message: 'Error saving JSON file' });
  }
} 