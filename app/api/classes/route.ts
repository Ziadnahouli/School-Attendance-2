import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { DEFAULT_CLASSES } from '@/lib/api';
import { ClassInfo } from '@/lib/types';

export const dynamic = 'force-dynamic';

const dataFilePath = path.join(process.cwd(), 'data', 'classes.json');

async function loadClasses(): Promise<ClassInfo[]> {
  try {
    const raw = await fs.readFile(dataFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // If local file is missing, try creating it with DEFAULT_CLASSES
    try {
      await saveClasses(DEFAULT_CLASSES);
      return DEFAULT_CLASSES;
    } catch {
      // ignore
    }
  }
  return [];
}

async function saveClasses(classes: ClassInfo[]): Promise<void> {
  await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
  await fs.writeFile(dataFilePath, JSON.stringify(classes, null, 2), 'utf-8');
}

export async function GET() {
  const classes = await loadClasses();
  return NextResponse.json(classes);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { division, name, section } = body || {};

    if (!division || !name || !section) {
      return NextResponse.json(
        { error: 'Division, Class Name, and Section are all required.' },
        { status: 400 }
      );
    }

    const currentClasses = await loadClasses();
    const divTrim = String(division).trim();
    const nameTrim = String(name).trim();
    const secTrim = String(section).trim();

    // Check for exact duplicate
    const exists = currentClasses.some(
      (c) =>
        c.division.toLowerCase() === divTrim.toLowerCase() &&
        c.name.toLowerCase() === nameTrim.toLowerCase() &&
        c.section.toLowerCase() === secTrim.toLowerCase()
    );

    if (exists) {
      return NextResponse.json(
        { error: `Class "${nameTrim}" with section "${secTrim}" in "${divTrim}" division already exists.` },
        { status: 409 }
      );
    }

    const id = `cls-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newClass: ClassInfo = {
      id,
      division: divTrim,
      name: nameTrim,
      section: secTrim,
    };

    const updated = [newClass, ...currentClasses];
    await saveClasses(updated);

    return NextResponse.json(
      {
        success: true,
        message: `Class "${nameTrim}" (${secTrim}) added to ${divTrim} division successfully.`,
        class: newClass,
        classes: updated,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to add class';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'Class ID is required for deletion.' }, { status: 400 });
    }

    const currentClasses = await loadClasses();
    const updated = currentClasses.filter((c) => c.id !== id);

    if (updated.length === currentClasses.length) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
    }

    await saveClasses(updated);

    return NextResponse.json({
      success: true,
      message: 'Class removed successfully.',
      classes: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete class';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
