"use server";

import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { Query, ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { parseStringify, constructFileUrl } from "@/lib/utils";
import { cookies } from "next/headers";
import { avatarPlaceholderUrl } from "@/constants";
import { redirect } from "next/navigation";

const getUserByEmail = async (email: string) => {
  const { tables } = await createAdminClient();

  const result = await tables.listRows({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.usersTableId,
    queries: [Query.equal("email", [email])],
  });

  return result.total > 0 ? result.rows[0] : null;
};

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient();

  try {
    const session = await account.createEmailToken({
      userId: ID.unique(),
      email: email,
    });

    return session.userId;
  } catch (error) {
    handleError(error, "Failed to send email OTP");
  }
};

export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  const existingUser = await getUserByEmail(email);

  const accountId = await sendEmailOTP({ email });
  if (!accountId) throw new Error("Failed to send OTP.");

  if (!existingUser) {
    const { tables } = await createAdminClient();

    await tables.createRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.usersTableId,
      rowId: ID.unique(),
      data: {
        fullName,
        email,
        avatar: avatarPlaceholderUrl,
        accountId,
      },
    });
  }

  return parseStringify({ accountId });
};

export const verifySecret = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}) => {
  try {
    const { account } = await createAdminClient();

    const session = await account.createSession({
      userId: accountId,
      secret: password,
    });

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify({ sessionId: session.$id });
  } catch (error) {
    handleError(error, "Failed to verify OTP");
  }
};

export const getCurrentUser = async () => {
  try {
    const { tables, account } = await createSessionClient();

    const result = await account.get();

    const user = await tables.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.usersTableId,
      queries: [Query.equal("accountId", result.$id)],
    });

    if (user.total <= 0) return null;

    return parseStringify(user.rows[0]);
  } catch (error) {
    console.log(error);
  }
};

export const signOutUser = async () => {
  const { account } = await createSessionClient();

  try {
    await account.deleteSession({ sessionId: "current" });
    (await cookies()).delete("appwrite-session");
  } catch (error) {
    handleError(error, "Failed to sign out user");
  } finally {
    redirect("/sign-in");
  }
};

export const signInUser = async ({ email }: { email: string }) => {
  try {
    const existingUser = await getUserByEmail(email);

    // User exists, send OTP
    if (existingUser) {
      await sendEmailOTP({ email });
      return parseStringify({ accountId: existingUser.accountId });
    }

    return parseStringify({ accountId: null, error: "User not found" });
  } catch (error) {
    handleError(error, "Failed to sign in user");
  }
};

export const updateUserProfile = async ({
  userId,
  fullName,
  avatarFile,
}: {
  userId: string;
  fullName?: string;
  avatarFile?: File;
}) => {
  try {
    const { tables, storage } = await createAdminClient();
    const currentUser = await getCurrentUser();

    if (currentUser.$id !== userId) {
      throw new Error("Unauthorized");
    }

    const updateData: any = {};

    // Handle avatar upload if provided
    if (avatarFile) {
      const inputFile = InputFile.fromBuffer(avatarFile, avatarFile.name);

      const uploadedFile = await storage.createFile({
        bucketId: appwriteConfig.bucketId,
        fileId: ID.unique(),
        file: inputFile,
      });

      updateData.avatar = constructFileUrl(uploadedFile.$id);
    }

    // Handle name update if provided
    if (fullName) updateData.fullName = fullName;

    const updatedUser = await tables.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.usersTableId,
      rowId: userId,
      data: updateData,
    });

    return parseStringify(updatedUser);
  } catch (error) {
    handleError(error, "Failed to update user profile");
  }
};
