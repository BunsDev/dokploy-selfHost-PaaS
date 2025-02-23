import { db } from "@dokploy/server/db";
import {
	type apiCreateUserInvitation,
	invitation,
	member,
	organization,
	users_temp,
} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { IS_CLOUD } from "../constants";

export type User = typeof users_temp.$inferSelect;
export const createInvitation = async (
	_input: typeof apiCreateUserInvitation._type,
	_adminId: string,
) => {
	// await db.transaction(async (tx) => {
	// 	const result = await tx
	// 		.insert(auth)
	// 		.values({
	// 			email: input.email.toLowerCase(),
	// 			rol: "user",
	// 			password: bcrypt.hashSync("01231203012312", 10),
	// 		})
	// 		.returning()
	// 		.then((res) => res[0]);
	// 	if (!result) {
	// 		throw new TRPCError({
	// 			code: "BAD_REQUEST",
	// 			message: "Error creating the user",
	// 		});
	// 	}
	// 	const expiresIn24Hours = new Date();
	// 	expiresIn24Hours.setDate(expiresIn24Hours.getDate() + 1);
	// const token = randomBytes(32).toString("hex");
	// await tx
	// 	.insert(users)
	// 	.values({
	// 		adminId: adminId,
	// 		authId: result.id,
	// 		token,
	// 		expirationDate: expiresIn24Hours.toISOString(),
	// 	})
	// 	.returning();
	// });
};

export const findUserById = async (userId: string) => {
	const user = await db.query.users_temp.findFirst({
		where: eq(users_temp.id, userId),
		// with: {
		// 	account: true,
		// },
	});
	if (!user) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "User not found",
		});
	}
	return user;
};

export const findOrganizationById = async (organizationId: string) => {
	const organizationResult = await db.query.organization.findFirst({
		where: eq(organization.id, organizationId),
	});
	return organizationResult;
};

export const updateUser = async (userId: string, userData: Partial<User>) => {
	const user = await db
		.update(users_temp)
		.set({
			...userData,
		})
		.where(eq(users_temp.id, userId))
		.returning()
		.then((res) => res[0]);

	return user;
};

export const updateAdminById = async (
	_adminId: string,
	_adminData: Partial<User>,
) => {
	// const admin = await db
	// 	.update(admins)
	// 	.set({
	// 		...adminData,
	// 	})
	// 	.where(eq(admins.adminId, adminId))
	// 	.returning()
	// 	.then((res) => res[0]);
	// return admin;
};

export const isAdminPresent = async () => {
	const admin = await db.query.member.findFirst({
		where: eq(member.role, "owner"),
	});

	if (!admin) {
		return false;
	}
	return true;
};

export const findAdmin = async () => {
	const admin = await db.query.member.findFirst({
		where: eq(member.role, "owner"),
		with: {
			user: true,
		},
	});

	if (!admin) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Admin not found",
		});
	}
	return admin;
};

export const getUserByToken = async (token: string) => {
	const user = await db.query.invitation.findFirst({
		where: eq(invitation.id, token),
		columns: {
			id: true,
			email: true,
			status: true,
			expiresAt: true,
			role: true,
			inviterId: true,
		},
	});

	if (!user) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Invitation not found",
		});
	}

	const userAlreadyExists = await db.query.users_temp.findFirst({
		where: eq(users_temp.email, user?.email || ""),
	});

	const { expiresAt, ...rest } = user;
	return {
		...rest,
		isExpired: user.expiresAt < new Date(),
		userAlreadyExists: !!userAlreadyExists,
	};
};

export const removeUserById = async (userId: string) => {
	await db
		.delete(users_temp)
		.where(eq(users_temp.id, userId))
		.returning()
		.then((res) => res[0]);
};

export const getDokployUrl = async () => {
	if (IS_CLOUD) {
		return "https://app.dokploy.com";
	}
	const admin = await findAdmin();

	if (admin.user.host) {
		return `https://${admin.user.host}`;
	}
	return `http://${admin.user.serverIp}:${process.env.PORT}`;
};
