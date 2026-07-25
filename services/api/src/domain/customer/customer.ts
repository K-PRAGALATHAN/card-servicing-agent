export interface KycDetails {
  readonly panMasked: string;
  readonly aadhaarMasked: string;
  readonly status: "verified" | "pending";
}

export interface Customer {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  /** scrypt hash; never leaves the domain/adapters boundary. */
  readonly passwordHash: string;
  readonly kyc: KycDetails;
}
