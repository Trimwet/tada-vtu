import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { status: false, message: 'Cable TV is not available in this version.' },
    { status: 404 }
  );
}
