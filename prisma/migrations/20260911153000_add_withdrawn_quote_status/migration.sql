-- Distinguish a transporter-withdrawn quote from customer decline or expiry.
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
