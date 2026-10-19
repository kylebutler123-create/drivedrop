-- DriveDrop schema-only baseline; existing preview data is not copied.
SET search_path TO public, extensions;
CREATE TYPE public."AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE public."BookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'COLLECTION_SCHEDULED', 'COLLECTED', 'IN_TRANSIT', 'ARRIVING_SOON', 'DELIVERED', 'CANCELLED');
CREATE TYPE public."DateNegotiationStatus" AS ENUM ('ORIGINAL', 'PROPOSED', 'ACCEPTED', 'DECLINED', 'COUNTERED');
CREATE TYPE public."DisputeResolution" AS ENUM ('REFUND_CUSTOMER', 'PARTIAL_REFUND', 'RELEASE_PAYOUT', 'NO_ACTION', 'OTHER');
CREATE TYPE public."DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');
CREATE TYPE public."EvidenceType" AS ENUM ('COLLECTION', 'DELIVERY');
CREATE TYPE public."FinanceEventType" AS ENUM ('PAYMENT_CREATED', 'PAYMENT_CAPTURED', 'REFUND_CREATED', 'PAYOUT_READY', 'PAYOUT_PAID');
CREATE TYPE public."JobStatus" AS ENUM ('OPEN', 'QUOTED', 'BOOKED', 'CANCELLED', 'COMPLETED');
CREATE TYPE public."PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED', 'CANCELLED');
CREATE TYPE public."PayoutStatus" AS ENUM ('NOT_READY', 'READY', 'PAID', 'HELD', 'CANCELLED');
CREATE TYPE public."QuoteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');
CREATE TYPE public."Role" AS ENUM ('CUSTOMER', 'TRANSPORTER', 'ADMIN');
CREATE TYPE public."VerificationDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE public."VerificationDocumentType" AS ENUM ('INSURANCE', 'COMPANY_REGISTRATION', 'IDENTITY', 'OPERATOR_LICENCE', 'OTHER', 'DRIVING_LICENCE');
CREATE TYPE public."VerificationStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TABLE public."AvailabilityRequest" (
  "id" text NOT NULL,
  "jobId" text NOT NULL,
  "quoteId" text NOT NULL,
  "customerId" text NOT NULL,
  "transporterId" text NOT NULL,
  "status" text DEFAULT 'AWAITING_TRANSPORTER'::text NOT NULL,
  "activeJobId" text,
  "pricePence" integer NOT NULL,
  "collectionDate" timestamp(3) without time zone NOT NULL,
  "collectionFrom" text,
  "collectionUntil" text,
  "respondBy" timestamp(3) without time zone NOT NULL,
  "confirmedAt" timestamp(3) without time zone,
  "payBy" timestamp(3) without time zone,
  "travelMinutes" integer,
  "bookingId" text,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  "paymentProvider" text,
  "paymentState" text,
  "checkoutSessionId" text,
  "paymentIntentId" text,
  "authorisedAmountPence" integer,
  "authorisationExpiresAt" timestamp(3) without time zone,
  "paymentEnvironment" text
);
CREATE TABLE public."Booking" (
  "id" text NOT NULL,
  "jobId" text NOT NULL,
  "quoteId" text NOT NULL,
  "customerId" text NOT NULL,
  "transporterId" text NOT NULL,
  "agreedPricePence" integer NOT NULL,
  "status" "BookingStatus" DEFAULT 'CONFIRMED'::"BookingStatus" NOT NULL,
  "customerConfirmedAt" timestamp with time zone,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "podRecipientName" text,
  "podNotes" text,
  "podSubmittedAt" timestamp with time zone,
  "pocReleasedByName" text,
  "pocCondition" text,
  "pocDamageNotes" text,
  "pocSubmittedAt" timestamp(3) without time zone,
  "deliveryLatitude" double precision,
  "deliveryLongitude" double precision,
  "deliveryLocationAccuracyMeters" double precision,
  "deliveryLocationCapturedAt" timestamp(3) without time zone,
  "customerCancellationSeenEventKey" text,
  "transporterPaidSeenEventKey" text,
  "transporterReadySeenEventKey" text,
  "customerCompletedSeenEventKey" text,
  "transporterAwaitingSeenEventKey" text
);
CREATE TABLE public."BookingPayment" (
  "id" text NOT NULL,
  "bookingId" text NOT NULL,
  "currency" text DEFAULT 'GBP'::text NOT NULL,
  "transportValuePence" integer NOT NULL,
  "depositPence" integer NOT NULL,
  "platformFeePence" integer NOT NULL,
  "transporterProceedsPence" integer NOT NULL,
  "remainingBalancePence" integer NOT NULL,
  "paidPence" integer DEFAULT 0 NOT NULL,
  "refundedPence" integer DEFAULT 0 NOT NULL,
  "status" "PaymentStatus" DEFAULT 'PENDING'::"PaymentStatus" NOT NULL,
  "payoutStatus" "PayoutStatus" DEFAULT 'NOT_READY'::"PayoutStatus" NOT NULL,
  "provider" text DEFAULT 'TEST'::text NOT NULL,
  "providerReference" text,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "cancellationDeductionPence" integer DEFAULT 0 NOT NULL
);
CREATE TABLE public."ConversationInboxState" (
  "id" text NOT NULL,
  "bookingId" text NOT NULL,
  "userId" text NOT NULL,
  "hiddenAt" timestamp(3) without time zone,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public."Dispute" (
  "id" text NOT NULL,
  "bookingId" text NOT NULL,
  "raisedById" text NOT NULL,
  "reason" text NOT NULL,
  "details" text,
  "evidenceUrl" text,
  "status" "DisputeStatus" DEFAULT 'OPEN'::"DisputeStatus" NOT NULL,
  "resolution" "DisputeResolution",
  "resolutionNote" text,
  "reviewerId" text,
  "reviewedAt" timestamp(3) without time zone,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public."DisputeReviewNote" (
  "id" text NOT NULL,
  "disputeId" text NOT NULL,
  "actorId" text,
  "kind" text NOT NULL,
  "body" text NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."EmailChangeToken" (
  "id" text NOT NULL,
  "tokenHash" text NOT NULL,
  "newEmail" text NOT NULL,
  "userId" text NOT NULL,
  "expiresAt" timestamp with time zone NOT NULL,
  "usedAt" timestamp with time zone,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."Evidence" (
  "id" text NOT NULL,
  "bookingId" text NOT NULL,
  "uploaderId" text NOT NULL,
  "type" "EvidenceType" NOT NULL,
  "imageUrl" text NOT NULL,
  "note" text,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."FinanceEvent" (
  "id" text NOT NULL,
  "paymentId" text NOT NULL,
  "type" "FinanceEventType" NOT NULL,
  "amountPence" integer,
  "note" text,
  "actorId" text,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."JobDigestRun" (
  "id" text NOT NULL,
  "windowEnd" timestamp(3) without time zone NOT NULL,
  "cursor" text,
  "pending" jsonb,
  "leaseToken" text,
  "leaseUntil" timestamp(3) without time zone,
  "completed" boolean DEFAULT false NOT NULL,
  "sentCount" integer DEFAULT 0 NOT NULL,
  "skippedCount" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public."Message" (
  "id" text NOT NULL,
  "bookingId" text NOT NULL,
  "senderId" text NOT NULL,
  "body" text NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "readAt" timestamp with time zone
);
CREATE TABLE public."MessageAttachment" (
  "id" text NOT NULL,
  "messageId" text NOT NULL,
  "storagePath" text NOT NULL,
  "mimeType" text NOT NULL,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public."Notification" (
  "id" text NOT NULL,
  "userId" text NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "href" text,
  "readAt" timestamp with time zone,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."PasswordResetToken" (
  "id" text NOT NULL,
  "tokenHash" text NOT NULL,
  "userId" text NOT NULL,
  "expiresAt" timestamp(3) without time zone NOT NULL,
  "usedAt" timestamp(3) without time zone,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public."Quote" (
  "id" text NOT NULL,
  "jobId" text NOT NULL,
  "transporterId" text NOT NULL,
  "pricePence" integer NOT NULL,
  "message" text,
  "status" "QuoteStatus" DEFAULT 'PENDING'::"QuoteStatus" NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "proposedCollectionDate" timestamp(3) without time zone,
  "dateNegotiationStatus" "DateNegotiationStatus" DEFAULT 'ORIGINAL'::"DateNegotiationStatus" NOT NULL,
  "expiresAt" timestamp(3) without time zone,
  "proposedCollectionFrom" text,
  "proposedCollectionUntil" text
);
CREATE TABLE public."Review" (
  "id" text NOT NULL,
  "bookingId" text NOT NULL,
  "customerId" text NOT NULL,
  "transporterId" text NOT NULL,
  "rating" integer NOT NULL,
  "body" text,
  "verified" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "transporterResponse" text,
  "transporterRespondedAt" timestamp with time zone,
  "moderationStatus" text DEFAULT 'VISIBLE'::text NOT NULL,
  "disputeReason" text,
  "disputeDetails" text,
  "disputedAt" timestamp with time zone,
  "moderationNote" text,
  "moderatedAt" timestamp with time zone
);
CREATE TABLE public."Session" (
  "id" text NOT NULL,
  "tokenHash" text NOT NULL,
  "userId" text NOT NULL,
  "expiresAt" timestamp with time zone NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."SupportConversation" (
  "id" text NOT NULL,
  "userId" text NOT NULL,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public."SupportMessage" (
  "id" text NOT NULL,
  "conversationId" text NOT NULL,
  "senderId" text NOT NULL,
  "body" text NOT NULL,
  "readAt" timestamp(3) without time zone,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public."TrackingEvent" (
  "id" text NOT NULL,
  "bookingId" text NOT NULL,
  "status" "BookingStatus" NOT NULL,
  "note" text,
  "actorId" text NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."TransportJob" (
  "id" text NOT NULL,
  "customerId" text NOT NULL,
  "collection" text NOT NULL,
  "delivery" text NOT NULL,
  "vehicleMake" text NOT NULL,
  "vehicleModel" text NOT NULL,
  "registration" text,
  "running" boolean DEFAULT true NOT NULL,
  "collectionDate" timestamp with time zone NOT NULL,
  "status" "JobStatus" DEFAULT 'OPEN'::"JobStatus" NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "vehicleType" text,
  "transportType" text DEFAULT 'ANY'::text NOT NULL,
  "collectionFrom" text,
  "collectionUntil" text,
  "vehiclePhotoPath" text
);
CREATE TABLE public."TransporterCancellationDeduction" (
  "id" text NOT NULL,
  "feeId" text NOT NULL,
  "paymentId" text NOT NULL,
  "amountPence" integer NOT NULL,
  "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public."TransporterCancellationFee" (
  "id" text NOT NULL,
  "transporterId" text NOT NULL,
  "cancelledBookingId" text NOT NULL,
  "amountPence" integer DEFAULT 2500 NOT NULL,
  "appliedPence" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'PENDING'::text NOT NULL,
  "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "appliedAt" timestamp(3) with time zone
);
CREATE TABLE public."TransporterPayoutDetails" (
  "id" text NOT NULL,
  "userId" text NOT NULL,
  "accountHolderName" text NOT NULL,
  "sortCodeLast2" text NOT NULL,
  "accountNumberLast4" text NOT NULL,
  "detailsToken" text NOT NULL,
  "completedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public."TransporterVerification" (
  "id" text NOT NULL,
  "transporterId" text NOT NULL,
  "businessName" text NOT NULL,
  "companyNumber" text,
  "businessAddress" text NOT NULL,
  "phone" text NOT NULL,
  "yearsOperating" integer,
  "website" text,
  "status" "VerificationStatus" DEFAULT 'NOT_STARTED'::"VerificationStatus" NOT NULL,
  "submittedAt" timestamp with time zone,
  "reviewedAt" timestamp with time zone,
  "reviewerId" text,
  "reviewNote" text,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "profileImagePath" text,
  "transporterPhotoPath" text,
  "truckPhotoPath" text
);
CREATE TABLE public."User" (
  "id" text NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "role" "Role" NOT NULL,
  "passwordHash" text NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "accountStatus" "AccountStatus" DEFAULT 'ACTIVE'::"AccountStatus" NOT NULL,
  "workRestricted" boolean DEFAULT false NOT NULL,
  "adminNote" text,
  "phone" text,
  "dailyJobEmails" boolean DEFAULT true NOT NULL
);
CREATE TABLE public."VerificationDocument" (
  "id" text NOT NULL,
  "verificationId" text NOT NULL,
  "uploaderId" text NOT NULL,
  "type" "VerificationDocumentType" NOT NULL,
  "documentUrl" text NOT NULL,
  "policyNumber" text,
  "insurer" text,
  "expiresAt" timestamp with time zone,
  "status" "VerificationDocumentStatus" DEFAULT 'PENDING'::"VerificationDocumentStatus" NOT NULL,
  "reviewerId" text,
  "reviewedAt" timestamp with time zone,
  "reviewNote" text,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_active_check" CHECK ((((status = ANY (ARRAY['AWAITING_AUTHORISATION'::text, 'AWAITING_TRANSPORTER'::text, 'AWAITING_PAYMENT'::text, 'CAPTURING'::text])) AND ("activeJobId" = "jobId") AND ("activeJobId" IS NOT NULL)) OR ((status <> ALL (ARRAY['AWAITING_AUTHORISATION'::text, 'AWAITING_TRANSPORTER'::text, 'AWAITING_PAYMENT'::text, 'CAPTURING'::text])) AND ("activeJobId" IS NULL))));
ALTER TABLE public."AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_authorised_amount_check" CHECK ((("authorisedAmountPence" IS NULL) OR ("authorisedAmountPence" >= "pricePence")));
ALTER TABLE public."AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_confirmed_check" CHECK (((status <> ALL (ARRAY['AWAITING_PAYMENT'::text, 'CAPTURING'::text, 'BOOKED'::text])) OR (("confirmedAt" IS NOT NULL) AND (("paymentProvider" IS NOT NULL) OR ("payBy" IS NOT NULL)))));
ALTER TABLE public."AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_pkey" PRIMARY KEY (id);
ALTER TABLE public."AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_price_check" CHECK (("pricePence" > 0));
ALTER TABLE public."AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_status_check" CHECK ((status = ANY (ARRAY['AWAITING_AUTHORISATION'::text, 'AWAITING_TRANSPORTER'::text, 'AWAITING_PAYMENT'::text, 'CAPTURING'::text, 'PAYMENT_FAILED'::text, 'DECLINED'::text, 'WITHDRAWN'::text, 'EXPIRED'::text, 'BOOKED'::text])));
ALTER TABLE public."Booking" ADD CONSTRAINT "Booking_jobId_key" UNIQUE ("jobId");
ALTER TABLE public."Booking" ADD CONSTRAINT "Booking_pkey" PRIMARY KEY (id);
ALTER TABLE public."Booking" ADD CONSTRAINT "Booking_quoteId_key" UNIQUE ("quoteId");
ALTER TABLE public."BookingPayment" ADD CONSTRAINT "BookingPayment_bookingId_key" UNIQUE ("bookingId");
ALTER TABLE public."BookingPayment" ADD CONSTRAINT "BookingPayment_cancellationDeductionPence_check" CHECK (("cancellationDeductionPence" >= 0));
ALTER TABLE public."BookingPayment" ADD CONSTRAINT "BookingPayment_pkey" PRIMARY KEY (id);
ALTER TABLE public."ConversationInboxState" ADD CONSTRAINT "ConversationInboxState_pkey" PRIMARY KEY (id);
ALTER TABLE public."Dispute" ADD CONSTRAINT "Dispute_pkey" PRIMARY KEY (id);
ALTER TABLE public."DisputeReviewNote" ADD CONSTRAINT "DisputeReviewNote_body_check" CHECK (((char_length(body) >= 1) AND (char_length(body) <= 2000)));
ALTER TABLE public."DisputeReviewNote" ADD CONSTRAINT "DisputeReviewNote_kind_check" CHECK ((kind = ANY (ARRAY['REVIEW'::text, 'OUTCOME'::text])));
ALTER TABLE public."DisputeReviewNote" ADD CONSTRAINT "DisputeReviewNote_pkey" PRIMARY KEY (id);
ALTER TABLE public."EmailChangeToken" ADD CONSTRAINT "EmailChangeToken_pkey" PRIMARY KEY (id);
ALTER TABLE public."EmailChangeToken" ADD CONSTRAINT "EmailChangeToken_tokenHash_key" UNIQUE ("tokenHash");
ALTER TABLE public."Evidence" ADD CONSTRAINT "Evidence_pkey" PRIMARY KEY (id);
ALTER TABLE public."FinanceEvent" ADD CONSTRAINT "FinanceEvent_pkey" PRIMARY KEY (id);
ALTER TABLE public."JobDigestRun" ADD CONSTRAINT "JobDigestRun_pkey" PRIMARY KEY (id);
ALTER TABLE public."Message" ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);
ALTER TABLE public."MessageAttachment" ADD CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY (id);
ALTER TABLE public."Notification" ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);
ALTER TABLE public."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);
ALTER TABLE public."Quote" ADD CONSTRAINT "Quote_jobId_transporterId_key" UNIQUE ("jobId", "transporterId");
ALTER TABLE public."Quote" ADD CONSTRAINT "Quote_pkey" PRIMARY KEY (id);
ALTER TABLE public."Quote" ADD CONSTRAINT "Quote_proposed_collection_window_check" CHECK (((("proposedCollectionFrom" IS NULL) AND ("proposedCollectionUntil" IS NULL)) OR (("proposedCollectionDate" IS NOT NULL) AND ("proposedCollectionFrom" IS NOT NULL) AND ("proposedCollectionUntil" IS NOT NULL) AND ("proposedCollectionFrom" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'::text) AND ("proposedCollectionUntil" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'::text) AND ("proposedCollectionFrom" < "proposedCollectionUntil"))));
ALTER TABLE public."Review" ADD CONSTRAINT "Review_bookingId_key" UNIQUE ("bookingId");
ALTER TABLE public."Review" ADD CONSTRAINT "Review_pkey" PRIMARY KEY (id);
ALTER TABLE public."Session" ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);
ALTER TABLE public."Session" ADD CONSTRAINT "Session_tokenHash_key" UNIQUE ("tokenHash");
ALTER TABLE public."SupportConversation" ADD CONSTRAINT "SupportConversation_pkey" PRIMARY KEY (id);
ALTER TABLE public."SupportMessage" ADD CONSTRAINT "SupportMessage_pkey" PRIMARY KEY (id);
ALTER TABLE public."TrackingEvent" ADD CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY (id);
ALTER TABLE public."TransportJob" ADD CONSTRAINT "TransportJob_pkey" PRIMARY KEY (id);
ALTER TABLE public."TransportJob" ADD CONSTRAINT "TransportJob_transportType_check" CHECK (("transportType" = ANY (ARRAY['ANY'::text, 'DRIVEN'::text, 'OPEN'::text, 'ENCLOSED'::text])));
ALTER TABLE public."TransporterCancellationDeduction" ADD CONSTRAINT "TransporterCancellationDeduction_amount_check" CHECK (("amountPence" > 0));
ALTER TABLE public."TransporterCancellationDeduction" ADD CONSTRAINT "TransporterCancellationDeduction_feeId_paymentId_key" UNIQUE ("feeId", "paymentId");
ALTER TABLE public."TransporterCancellationDeduction" ADD CONSTRAINT "TransporterCancellationDeduction_pkey" PRIMARY KEY (id);
ALTER TABLE public."TransporterCancellationFee" ADD CONSTRAINT "TransporterCancellationFee_amount_check" CHECK (("amountPence" > 0));
ALTER TABLE public."TransporterCancellationFee" ADD CONSTRAINT "TransporterCancellationFee_applied_check" CHECK ((("appliedPence" >= 0) AND ("appliedPence" <= "amountPence")));
ALTER TABLE public."TransporterCancellationFee" ADD CONSTRAINT "TransporterCancellationFee_cancelledBookingId_key" UNIQUE ("cancelledBookingId");
ALTER TABLE public."TransporterCancellationFee" ADD CONSTRAINT "TransporterCancellationFee_pkey" PRIMARY KEY (id);
ALTER TABLE public."TransporterCancellationFee" ADD CONSTRAINT "TransporterCancellationFee_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'PARTIALLY_APPLIED'::text, 'APPLIED'::text, 'WAIVED'::text])));
ALTER TABLE public."TransporterPayoutDetails" ADD CONSTRAINT "TransporterPayoutDetails_pkey" PRIMARY KEY (id);
ALTER TABLE public."TransporterPayoutDetails" ADD CONSTRAINT "TransporterPayoutDetails_userId_key" UNIQUE ("userId");
ALTER TABLE public."TransporterVerification" ADD CONSTRAINT "TransporterVerification_pkey" PRIMARY KEY (id);
ALTER TABLE public."TransporterVerification" ADD CONSTRAINT "TransporterVerification_transporterId_key" UNIQUE ("transporterId");
ALTER TABLE public."User" ADD CONSTRAINT "User_email_key" UNIQUE (email);
ALTER TABLE public."User" ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);
ALTER TABLE public."VerificationDocument" ADD CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY (id);
CREATE UNIQUE INDEX "AvailabilityRequest_activeJobId_key" ON public."AvailabilityRequest" USING btree ("activeJobId");
CREATE UNIQUE INDEX "AvailabilityRequest_bookingId_key" ON public."AvailabilityRequest" USING btree ("bookingId");
CREATE UNIQUE INDEX "AvailabilityRequest_checkoutSessionId_key" ON public."AvailabilityRequest" USING btree ("checkoutSessionId");
CREATE INDEX "AvailabilityRequest_customerId_createdAt_idx" ON public."AvailabilityRequest" USING btree ("customerId", "createdAt");
CREATE INDEX "AvailabilityRequest_jobId_idx" ON public."AvailabilityRequest" USING btree ("jobId");
CREATE UNIQUE INDEX "AvailabilityRequest_paymentIntentId_key" ON public."AvailabilityRequest" USING btree ("paymentIntentId");
CREATE INDEX "AvailabilityRequest_quoteId_idx" ON public."AvailabilityRequest" USING btree ("quoteId");
CREATE INDEX "AvailabilityRequest_status_respondBy_payBy_idx" ON public."AvailabilityRequest" USING btree (status, "respondBy", "payBy");
CREATE INDEX "AvailabilityRequest_transporterId_createdAt_idx" ON public."AvailabilityRequest" USING btree ("transporterId", "createdAt");
CREATE INDEX "Booking_customerId_status_createdAt_idx" ON public."Booking" USING btree ("customerId", status, "createdAt");
CREATE INDEX "Booking_transporterId_status_createdAt_idx" ON public."Booking" USING btree ("transporterId", status, "createdAt");
CREATE UNIQUE INDEX "ConversationInboxState_bookingId_userId_key" ON public."ConversationInboxState" USING btree ("bookingId", "userId");
CREATE INDEX "ConversationInboxState_userId_hiddenAt_idx" ON public."ConversationInboxState" USING btree ("userId", "hiddenAt");
CREATE INDEX "DisputeReviewNote_actorId_idx" ON public."DisputeReviewNote" USING btree ("actorId");
CREATE INDEX "DisputeReviewNote_disputeId_createdAt_idx" ON public."DisputeReviewNote" USING btree ("disputeId", "createdAt");
CREATE INDEX "Dispute_bookingId_status_createdAt_idx" ON public."Dispute" USING btree ("bookingId", status, "createdAt");
CREATE INDEX "Dispute_raisedById_createdAt_idx" ON public."Dispute" USING btree ("raisedById", "createdAt");
CREATE INDEX "Dispute_reviewerId_idx" ON public."Dispute" USING btree ("reviewerId");
CREATE INDEX "EmailChangeToken_expiresAt_idx" ON public."EmailChangeToken" USING btree ("expiresAt");
CREATE INDEX "EmailChangeToken_userId_expiresAt_idx" ON public."EmailChangeToken" USING btree ("userId", "expiresAt");
CREATE INDEX "Evidence_bookingId_type_createdAt_idx" ON public."Evidence" USING btree ("bookingId", type, "createdAt");
CREATE INDEX "Evidence_uploaderId_idx" ON public."Evidence" USING btree ("uploaderId");
CREATE INDEX "FinanceEvent_paymentId_createdAt_idx" ON public."FinanceEvent" USING btree ("paymentId", "createdAt");
CREATE INDEX "JobDigestRun_createdAt_idx" ON public."JobDigestRun" USING btree ("createdAt");
CREATE INDEX "MessageAttachment_messageId_createdAt_idx" ON public."MessageAttachment" USING btree ("messageId", "createdAt");
CREATE INDEX "Message_bookingId_createdAt_idx" ON public."Message" USING btree ("bookingId", "createdAt");
CREATE INDEX "Message_bookingId_readAt_idx" ON public."Message" USING btree ("bookingId", "readAt");
CREATE INDEX "Message_senderId_idx" ON public."Message" USING btree ("senderId");
CREATE INDEX "Notification_userId_createdAt_idx" ON public."Notification" USING btree ("userId", "createdAt" DESC);
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON public."Notification" USING btree ("userId", "readAt", "createdAt" DESC);
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON public."PasswordResetToken" USING btree ("expiresAt");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON public."PasswordResetToken" USING btree ("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON public."PasswordResetToken" USING btree ("userId", "expiresAt");
CREATE INDEX "Quote_expiresAt_idx" ON public."Quote" USING btree ("expiresAt");
CREATE INDEX "Quote_transporterId_status_createdAt_idx" ON public."Quote" USING btree ("transporterId", status, "createdAt");
CREATE INDEX "Review_customerId_idx" ON public."Review" USING btree ("customerId");
CREATE INDEX "Review_moderationStatus_createdAt_idx" ON public."Review" USING btree ("moderationStatus", "createdAt");
CREATE INDEX "Review_transporterId_createdAt_idx" ON public."Review" USING btree ("transporterId", "createdAt");
CREATE INDEX "Review_transporterId_moderationStatus_createdAt_idx" ON public."Review" USING btree ("transporterId", "moderationStatus", "createdAt");
CREATE INDEX "Session_expiresAt_idx" ON public."Session" USING btree ("expiresAt");
CREATE INDEX "Session_userId_expiresAt_idx" ON public."Session" USING btree ("userId", "expiresAt");
CREATE INDEX "SupportConversation_updatedAt_idx" ON public."SupportConversation" USING btree ("updatedAt");
CREATE UNIQUE INDEX "SupportConversation_userId_key" ON public."SupportConversation" USING btree ("userId");
CREATE INDEX "SupportMessage_conversationId_createdAt_idx" ON public."SupportMessage" USING btree ("conversationId", "createdAt");
CREATE INDEX "SupportMessage_conversationId_readAt_idx" ON public."SupportMessage" USING btree ("conversationId", "readAt");
CREATE INDEX "SupportMessage_senderId_idx" ON public."SupportMessage" USING btree ("senderId");
CREATE INDEX "TrackingEvent_actorId_idx" ON public."TrackingEvent" USING btree ("actorId");
CREATE INDEX "TrackingEvent_bookingId_createdAt_idx" ON public."TrackingEvent" USING btree ("bookingId", "createdAt");
CREATE INDEX "TransportJob_customerId_status_createdAt_idx" ON public."TransportJob" USING btree ("customerId", status, "createdAt");
CREATE INDEX "TransportJob_status_createdAt_idx" ON public."TransportJob" USING btree (status, "createdAt");
CREATE INDEX "TransporterCancellationDeduction_paymentId_idx" ON public."TransporterCancellationDeduction" USING btree ("paymentId");
CREATE INDEX "TransporterCancellationFee_transporterId_status_createdAt_idx" ON public."TransporterCancellationFee" USING btree ("transporterId", status, "createdAt");
CREATE INDEX "TransporterPayoutDetails_userId_idx" ON public."TransporterPayoutDetails" USING btree ("userId");
CREATE INDEX "TransporterVerification_reviewerId_idx" ON public."TransporterVerification" USING btree ("reviewerId");
CREATE INDEX "User_role_accountStatus_dailyJobEmails_id_idx" ON public."User" USING btree (role, "accountStatus", "dailyJobEmails", id);
CREATE INDEX "VerificationDocument_expiresAt_idx" ON public."VerificationDocument" USING btree ("expiresAt");
CREATE INDEX "VerificationDocument_reviewerId_idx" ON public."VerificationDocument" USING btree ("reviewerId");
CREATE INDEX "VerificationDocument_uploaderId_idx" ON public."VerificationDocument" USING btree ("uploaderId");
CREATE INDEX "VerificationDocument_verificationId_type_idx" ON public."VerificationDocument" USING btree ("verificationId", type);
ALTER TABLE public."AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "TransportJob"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public."AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public."Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"(id);
ALTER TABLE public."Booking" ADD CONSTRAINT "Booking_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "TransportJob"(id);
ALTER TABLE public."Booking" ADD CONSTRAINT "Booking_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"(id);
ALTER TABLE public."Booking" ADD CONSTRAINT "Booking_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "User"(id);
ALTER TABLE public."BookingPayment" ADD CONSTRAINT "BookingPayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"(id) ON DELETE CASCADE;
ALTER TABLE public."ConversationInboxState" ADD CONSTRAINT "ConversationInboxState_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public."ConversationInboxState" ADD CONSTRAINT "ConversationInboxState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public."Dispute" ADD CONSTRAINT "Dispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public."Dispute" ADD CONSTRAINT "Dispute_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public."Dispute" ADD CONSTRAINT "Dispute_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public."DisputeReviewNote" ADD CONSTRAINT "DisputeReviewNote_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"(id) ON DELETE SET NULL;
ALTER TABLE public."DisputeReviewNote" ADD CONSTRAINT "DisputeReviewNote_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"(id) ON DELETE CASCADE;
ALTER TABLE public."EmailChangeToken" ADD CONSTRAINT "EmailChangeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE public."Evidence" ADD CONSTRAINT "Evidence_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"(id) ON DELETE CASCADE;
ALTER TABLE public."Evidence" ADD CONSTRAINT "Evidence_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"(id);
ALTER TABLE public."FinanceEvent" ADD CONSTRAINT "FinanceEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "BookingPayment"(id) ON DELETE CASCADE;
ALTER TABLE public."Message" ADD CONSTRAINT "Message_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"(id) ON DELETE CASCADE;
ALTER TABLE public."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"(id);
ALTER TABLE public."MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE public."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public."Quote" ADD CONSTRAINT "Quote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "TransportJob"(id);
ALTER TABLE public."Quote" ADD CONSTRAINT "Quote_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "User"(id);
ALTER TABLE public."Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"(id) ON DELETE CASCADE;
ALTER TABLE public."Review" ADD CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"(id);
ALTER TABLE public."Review" ADD CONSTRAINT "Review_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "User"(id);
ALTER TABLE public."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE public."SupportConversation" ADD CONSTRAINT "SupportConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public."SupportMessage" ADD CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public."SupportMessage" ADD CONSTRAINT "SupportMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public."TrackingEvent" ADD CONSTRAINT "TrackingEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"(id);
ALTER TABLE public."TrackingEvent" ADD CONSTRAINT "TrackingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"(id) ON DELETE CASCADE;
ALTER TABLE public."TransportJob" ADD CONSTRAINT "TransportJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"(id);
ALTER TABLE public."TransporterCancellationDeduction" ADD CONSTRAINT "TransporterCancellationDeduction_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "TransporterCancellationFee"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public."TransporterCancellationDeduction" ADD CONSTRAINT "TransporterCancellationDeduction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "BookingPayment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public."TransporterCancellationFee" ADD CONSTRAINT "TransporterCancellationFee_cancelledBookingId_fkey" FOREIGN KEY ("cancelledBookingId") REFERENCES "Booking"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public."TransporterCancellationFee" ADD CONSTRAINT "TransporterCancellationFee_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public."TransporterPayoutDetails" ADD CONSTRAINT "TransporterPayoutDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE public."TransporterVerification" ADD CONSTRAINT "TransporterVerification_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"(id);
ALTER TABLE public."TransporterVerification" ADD CONSTRAINT "TransporterVerification_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE public."VerificationDocument" ADD CONSTRAINT "VerificationDocument_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"(id);
ALTER TABLE public."VerificationDocument" ADD CONSTRAINT "VerificationDocument_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"(id);
ALTER TABLE public."VerificationDocument" ADD CONSTRAINT "VerificationDocument_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "TransporterVerification"(id) ON DELETE CASCADE;
ALTER TABLE public."AvailabilityRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."AvailabilityRequest" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."AvailabilityRequest" TO service_role;
ALTER TABLE public."Booking" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Booking" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."Booking" TO service_role;
ALTER TABLE public."BookingPayment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."BookingPayment" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."BookingPayment" TO service_role;
ALTER TABLE public."ConversationInboxState" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."ConversationInboxState" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."ConversationInboxState" TO service_role;
ALTER TABLE public."Dispute" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Dispute" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."Dispute" TO service_role;
ALTER TABLE public."DisputeReviewNote" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."DisputeReviewNote" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."DisputeReviewNote" TO service_role;
ALTER TABLE public."EmailChangeToken" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."EmailChangeToken" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."EmailChangeToken" TO service_role;
ALTER TABLE public."Evidence" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Evidence" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."Evidence" TO service_role;
ALTER TABLE public."FinanceEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."FinanceEvent" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."FinanceEvent" TO service_role;
ALTER TABLE public."JobDigestRun" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."JobDigestRun" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."JobDigestRun" TO service_role;
ALTER TABLE public."Message" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Message" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."Message" TO service_role;
ALTER TABLE public."MessageAttachment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."MessageAttachment" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."MessageAttachment" TO service_role;
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Notification" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."Notification" TO service_role;
ALTER TABLE public."PasswordResetToken" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."PasswordResetToken" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."PasswordResetToken" TO service_role;
ALTER TABLE public."Quote" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Quote" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."Quote" TO service_role;
ALTER TABLE public."Review" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Review" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."Review" TO service_role;
ALTER TABLE public."Session" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Session" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."Session" TO service_role;
ALTER TABLE public."SupportConversation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."SupportConversation" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."SupportConversation" TO service_role;
ALTER TABLE public."SupportMessage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."SupportMessage" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."SupportMessage" TO service_role;
ALTER TABLE public."TrackingEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."TrackingEvent" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."TrackingEvent" TO service_role;
ALTER TABLE public."TransportJob" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."TransportJob" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."TransportJob" TO service_role;
ALTER TABLE public."TransporterCancellationDeduction" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."TransporterCancellationDeduction" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."TransporterCancellationDeduction" TO service_role;
ALTER TABLE public."TransporterCancellationFee" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."TransporterCancellationFee" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."TransporterCancellationFee" TO service_role;
ALTER TABLE public."TransporterPayoutDetails" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."TransporterPayoutDetails" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."TransporterPayoutDetails" TO service_role;
ALTER TABLE public."TransporterVerification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."TransporterVerification" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."TransporterVerification" TO service_role;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."User" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."User" TO service_role;
ALTER TABLE public."VerificationDocument" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."VerificationDocument" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."VerificationDocument" TO service_role;
-- Match the approved £50 cancellation fee and the existing repository migration.
ALTER TABLE public."TransporterCancellationFee" ALTER COLUMN "amountPence" SET DEFAULT 5000;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES
('delivery-evidence','delivery-evidence',false,8388608,ARRAY['image/jpeg','image/png','image/webp']),
('message-attachments','message-attachments',false,8388608,ARRAY['image/jpeg','image/png','image/webp']),
('transporter-profiles','transporter-profiles',true,2097152,ARRAY['image/jpeg','image/png','image/webp']),
('transporter-verification','transporter-verification',false,20971520,ARRAY['application/pdf','image/jpeg','image/png']),
('vehicle-photos','vehicle-photos',false,900000,ARRAY['image/jpeg','image/png','image/webp']);
