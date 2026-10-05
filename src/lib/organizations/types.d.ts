export type OrgPlan = "free";

export type OrgLimits = {
	maxDomains: number;
	maxMailboxes: number;
};

export type OrganizationDocument = {
	_id: string;
	slug: string;
	name: string;
	ownerUserId: string | null;
	createdAt: Date;
	plan: OrgPlan;
	limits: OrgLimits;
};

export type DomainVerificationStatus = "pending" | "verified" | "expired";

export type DomainVerificationDocument = {
	_id: string;
	organizationId: string;
	domainId: string;
	hostname: string;
	token: string;
	status: DomainVerificationStatus;
	createdAt: Date;
	verifiedAt: Date | null;
};

export type OrgSettingsDocument = {
	_id: string;
	organizationId: string;
	displayName: string | null;
	updatedAt: Date;
};
