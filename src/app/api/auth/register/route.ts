import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const allowedRoles = new Set(Object.values(UserRole));

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const familyName =
      typeof body.familyName === "string" ? body.familyName.trim() : "";
    const givenName =
      typeof body.givenName === "string" ? body.givenName.trim() : "";
    const role = body.role as UserRole | undefined;

    if (
      !email ||
      !password ||
      !familyName ||
      !givenName ||
      !role ||
      !allowedRoles.has(role)
    ) {
      return NextResponse.json(
        { error: "Invalid registration payload." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        familyName,
        givenName,
        name: `${familyName} ${givenName}`,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to register user." },
      { status: 500 },
    );
  }
}
