import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { status: false, message: 'Betting is not available in this version.' },
    { status: 404 }
  );
}
