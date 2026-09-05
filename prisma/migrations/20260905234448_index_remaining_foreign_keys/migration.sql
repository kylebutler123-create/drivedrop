CREATE INDEX "Dispute_reviewerId_idx" ON public."Dispute"("reviewerId");
CREATE INDEX "Evidence_uploaderId_idx" ON public."Evidence"("uploaderId");
CREATE INDEX "Message_senderId_idx" ON public."Message"("senderId");
CREATE INDEX "Review_customerId_idx" ON public."Review"("customerId");
CREATE INDEX "TrackingEvent_actorId_idx" ON public."TrackingEvent"("actorId");
CREATE INDEX "TransporterVerification_reviewerId_idx" ON public."TransporterVerification"("reviewerId");
CREATE INDEX "VerificationDocument_reviewerId_idx" ON public."VerificationDocument"("reviewerId");
CREATE INDEX "VerificationDocument_uploaderId_idx" ON public."VerificationDocument"("uploaderId");
