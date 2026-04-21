import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Sanitize filename
        const filename = file.name.replace(/[^a-z0-9.]/gi, '-').toLowerCase();
        const uniqueFilename = `${Date.now()}-${filename}`;
        const filePath = path.join(uploadDir, uniqueFilename);

        fs.writeFileSync(filePath, buffer);

        const publicUrl = `/uploads/${uniqueFilename}`;

        return NextResponse.json({ url: publicUrl });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
