import { getSession, getActiveOrganization } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { createUserSchema } from "./schema";


export async function POST(request: NextRequest) {
  const session = await getSession();
  const activeOrganization = await getActiveOrganization(request);
  
  if (!session?.user || !activeOrganization) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', message: "Session or active organization is invalid" },
      { status: 401 },
    );
  }

  try {
    const json = await request.json();
    const requestBody = createUserSchema.parse(json);
    const addUserResponse = await auth.api.createUser({
      body: {
        email: requestBody.email,
        password: requestBody.password,
        name: requestBody.name,
        role: 'user', // all created users must be user by default.
      }
    });

    return NextResponse.json(
      { success: true, addUserResponse },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Bad Request', message: "Unable to process new user request" },
      { status: 400 },
    );
  }
}