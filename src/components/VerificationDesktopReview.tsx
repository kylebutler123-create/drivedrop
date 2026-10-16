"use client";

import Icon from "@/app/components/ApprovedIcon";
import {
  documentReviewGroups,
  documentStoredFilename,
  orderedReviewDocuments,
  uploadDateLabel,
  verificationDate,
  verificationLabel as label,
  type ReviewDocument,
} from "@/lib/verification-document-review";
import "@/app/admin-verification-review.css";

type Verification = {
  id: string;
  status: string;
  businessName: string;
  companyNumber?: string | null;
  businessAddress?: string | null;
  phone?: string | null;
  yearsOperating?: number | null;
  website?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  documents: ReviewDocument[];
  transporter: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    accountStatus?: string;
    workRestricted?: boolean;
  };
};
type Filter =
  "ALL" | "VERIFY" | "REPLACEMENT" | "NOT_STARTED" | "APPROVED" | "REJECTED";
type Props = {
  filter: Filter;
  filters: { value: Exclude<Filter, "ALL">; label: string }[];
  counts: Record<Exclude<Filter, "ALL">, number>;
  rows: Verification[];
  query: string;
  setQuery: (query: string) => void;
  onFilter: (filter: Filter) => void;
  expanded: string | null;
  onExpand: (id: string | null) => void;
  message: string;
  busy: string | null;
  reviewingDocument: string | null;
  onReview: (id: string, status: string) => void;
  onDocumentReview: (id: string, status: "APPROVED" | "REJECTED") => void;
  onMessage: (verification: Verification) => void;
  onAccountAction: (
    verification: Verification,
    action: "SUSPEND" | "REACTIVATE" | "DELETE",
  ) => void;
};
const titles: Record<Filter, string> = {
  ALL: "Transporter accounts",
  VERIFY: "Accounts awaiting verification",
  REPLACEMENT: "Replacement insurance required",
  NOT_STARTED: "Verification not started",
  APPROVED: "Approved transporters",
  REJECTED: "Rejected verifications",
};
const icons: Record<Exclude<Filter, "ALL">, string> = {
  VERIFY: "shield",
  REPLACEMENT: "alert",
  NOT_STARTED: "calendar",
  APPROVED: "circleCheck",
  REJECTED: "ban",
};
const documentTitle = (type: string) =>
  type === "INSURANCE"
    ? "Insurance certificate"
    : type === "DRIVING_LICENCE"
      ? "Driving licence / ID"
      : label(type);
const documentShort = (type: string) =>
  type === "INSURANCE"
    ? "insurance"
    : type === "DRIVING_LICENCE"
      ? "driving licence"
      : label(type).toLowerCase();
const documentHref = (id: string) =>
  `/api/verification-documents/${encodeURIComponent(id)}`;
const todayStart = () => {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};
const expired = (d: ReviewDocument) =>
  !!d.expiresAt && new Date(d.expiresAt).getTime() < todayStart();

function Fact({
  name,
  value,
  tone,
}: {
  name: string;
  value: string;
  tone?: string;
}) {
  return (
    <div>
      <span>{name}</span>
      <b className={tone ? `vr-${tone}` : undefined}>{value}</b>
    </div>
  );
}

function DocumentCard({
  document,
  newest,
  history,
  verification,
  reviewingDocument,
  onDocumentReview,
}: {
  document: ReviewDocument;
  newest: boolean;
  history: ReviewDocument[];
  verification: Verification;
  reviewingDocument: string | null;
  onDocumentReview: Props["onDocumentReview"];
}) {
  const pending = document.status === "PENDING";
  const short = documentShort(document.type);
  const blockedInsurance =
    document.type === "INSURANCE" && (!document.expiresAt || expired(document));
  return (
    <section
      className={`vr-doc ${pending ? "vr-doc-pending" : "vr-doc-reviewed"}`}
      aria-label={`${documentTitle(document.type)} — ${pending ? "awaiting review" : label(document.status)}`}
      data-document-id={document.id}
    >
      <div className="vr-doc-head">
        <span>
          <Icon name={document.type === "INSURANCE" ? "shield" : "user"} />
          {documentTitle(document.type)}
        </span>
        <span className={`vr-new-label ${pending ? "" : "vr-reviewed-label"}`}>
          {pending
            ? newest
              ? "NEW UPLOAD"
              : "EARLIER UPLOAD"
            : label(document.status)}
        </span>
      </div>
      <div className="vr-upload-time">
        {document.createdAt
          ? `Uploaded ${uploadDateLabel(document.createdAt)} · UK time`
          : "Upload time not recorded"}
      </div>
      <div className="vr-doc-body">
        <div className="vr-file-name" title="Stored filename">
          <Icon name="file" />
          <span>{documentStoredFilename(document)}</span>
        </div>
        <div className="vr-doc-meta">
          <span>Review status</span>
          <strong
            className={
              pending
                ? "vr-amber"
                : document.status === "APPROVED"
                  ? "vr-green"
                  : undefined
            }
          >
            {pending ? "Awaiting admin review" : label(document.status)}
          </strong>
        </div>
        {document.type === "INSURANCE" ? (
          <>
            <div className="vr-doc-meta">
              <span>Insurer</span>
              <strong>{document.insurer || "Not provided"}</strong>
            </div>
            <div className="vr-doc-meta">
              <span>Policy / reference</span>
              <strong>{document.policyNumber || "Not provided"}</strong>
            </div>
          </>
        ) : (
          <>
            <div className="vr-doc-meta">
              <span>Document type</span>
              <strong>{label(document.type)}</strong>
            </div>
            <div className="vr-doc-meta">
              <span>Uploaded by</span>
              <strong>
                {document.uploaderId === verification.transporter.id
                  ? verification.transporter.name
                  : "Not recorded"}
              </strong>
            </div>
          </>
        )}
        <div className="vr-doc-meta">
          <span>Expiry date</span>
          <strong className={expired(document) ? "vr-red" : undefined}>
            {verificationDate(document.expiresAt, true)}
            {expired(document) ? " · Expired" : ""}
          </strong>
        </div>
        <a
          className="vr-button vr-open"
          href={documentHref(document.id)}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="arrow" />
          Open {pending && newest ? "NEW " : pending ? "earlier " : ""}
          {short}
        </a>
        {pending && (
          <div className="vr-doc-actions">
            <button
              type="button"
              className="vr-button vr-blue"
              disabled={!!reviewingDocument || blockedInsurance}
              title={
                blockedInsurance
                  ? "Insurance must have a current or future expiry date before approval"
                  : undefined
              }
              onClick={() => onDocumentReview(document.id, "APPROVED")}
            >
              {reviewingDocument === document.id
                ? "Saving…"
                : "Approve this upload"}
            </button>
            <button
              type="button"
              className="vr-button vr-danger"
              disabled={!!reviewingDocument}
              onClick={() => onDocumentReview(document.id, "REJECTED")}
            >
              Reject this upload
            </button>
          </div>
        )}
        {document.reviewNote && (
          <p className="vr-document-note">
            <b>Admin note:</b> {document.reviewNote}
          </p>
        )}
        {!!history.length && (
          <details className="vr-prior">
            <summary>
              <span>
                {history.every(
                  (d) =>
                    !document.createdAt ||
                    !d.createdAt ||
                    new Date(d.createdAt) <= new Date(document.createdAt),
                )
                  ? "Previous"
                  : "Other reviewed"}{" "}
                {short} ·{" "}
                {history.length === 1
                  ? `${label(history[0].status)}${history[0].expiresAt ? ` · Expires ${verificationDate(history[0].expiresAt)}` : ""}`
                  : `${history.length} versions`}
              </span>
              <Icon name="chevronDown" />
            </summary>
            <div className="vr-prior-body">
              {history.map((old) => (
                <div
                  className="vr-history-version"
                  key={old.id}
                  data-document-id={old.id}
                >
                  <p>
                    <b>{label(old.status)} version — not the upload above</b>
                  </p>
                  <p>
                    {documentStoredFilename(old)} ·{" "}
                    {old.createdAt
                      ? `Uploaded ${uploadDateLabel(old.createdAt)} · UK time`
                      : "Upload time not recorded"}
                  </p>
                  <p>
                    {old.policyNumber ? `Policy ${old.policyNumber} · ` : ""}
                    {old.expiresAt
                      ? `Expires ${verificationDate(old.expiresAt, true)}`
                      : "Expiry not provided"}
                    {expired(old) ? " · Expired" : ""}
                  </p>
                  {old.reviewedAt && (
                    <p>Reviewed {uploadDateLabel(old.reviewedAt)} · UK time</p>
                  )}
                  {old.reviewNote && <p>Admin note: {old.reviewNote}</p>}
                  <a
                    className="vr-button"
                    href={documentHref(old.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open {label(old.status).toLowerCase()} {short}
                  </a>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

export default function VerificationDesktopReview(props: Props) {
  const {
    filter,
    filters,
    counts,
    rows,
    query,
    setQuery,
    onFilter,
    expanded,
    onExpand,
    message,
    busy,
    reviewingDocument,
    onReview,
    onDocumentReview,
    onMessage,
    onAccountAction,
  } = props;
  return (
    <div className="verificationDesktopReview">
      <div
        className="vr-filters"
        role="group"
        aria-label="Filter transporter verification"
      >
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            className="vr-filter"
            data-filter={item.value}
            aria-pressed={filter === item.value}
            onClick={() => onFilter(filter === item.value ? "ALL" : item.value)}
          >
            <span className="vr-filter-top">
              <strong>{counts[item.value]}</strong>
              <Icon name={icons[item.value]} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      {message && (
        <div className="vr-feedback" role="status">
          {message}
        </div>
      )}
      <section className="vr-workspace">
        <div className="vr-list-top">
          <div>
            <h2>{titles[filter]}</h2>
            <div className="vr-count">
              {rows.length} transporter account{rows.length === 1 ? "" : "s"}
            </div>
          </div>
          <label className="vr-search">
            <Icon name="search" />
            <input
              type="search"
              aria-label="Search transporter verification"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, email, business or document"
            />
          </label>
        </div>
        <div className="vr-list">
          <div className="vr-list-head">
            <span>Transporter & verification details</span>
            <span>Select a card to review</span>
          </div>
          {!rows.length && (
            <div className="vr-empty">
              {query
                ? "No transporter verification records match your search."
                : "No transporter accounts in this category."}
            </div>
          )}
          {rows.map((verification) => {
            const open = expanded === verification.id;
            const docs = orderedReviewDocuments(verification.documents || []);
            const pending = docs.filter((d) => d.status === "PENDING");
            const insurance =
              docs.find(
                (d) => d.type === "INSURANCE" && d.status !== "REJECTED",
              ) || docs.find((d) => d.type === "INSURANCE");
            const licence =
              docs.find(
                (d) => d.type === "DRIVING_LICENCE" && d.status !== "REJECTED",
              ) || docs.find((d) => d.type === "DRIVING_LICENCE");
            const currentInsurance =
              !!insurance?.expiresAt &&
              ["APPROVED", "PENDING"].includes(insurance.status) &&
              !expired(insurance);
            const requiredApproved =
              docs.some(
                (d) =>
                  d.type === "INSURANCE" &&
                  d.status === "APPROVED" &&
                  !!d.expiresAt &&
                  !expired(d),
              ) &&
              docs.some(
                (d) => d.type === "DRIVING_LICENCE" && d.status === "APPROVED",
              );
            const approvalBlocked =
              verification.status !== "NOT_STARTED" &&
              verification.status !== "APPROVED" &&
              !requiredApproved;
            const replacement =
              verification.status !== "NOT_STARTED" && !currentInsurance;
            const expiredCount = docs.filter(expired).length;
            const soon = docs.filter(
              (d) =>
                d.expiresAt &&
                !expired(d) &&
                new Date(d.expiresAt).getTime() <= todayStart() + 30 * 86400000,
            ).length;
            const account = verification.transporter.accountStatus || "ACTIVE";
            const phone =
              verification.phone || verification.transporter.phone || "";
            const rejected = docs.filter((d) => d.status === "REJECTED").length;
            const groups = documentReviewGroups(docs);
            const contentId = `verification-review-${verification.id}`;
            return (
              <article
                className={`vr-record ${open ? "vr-expanded-record" : ""} ${replacement ? "vr-expired" : ""}`}
                key={verification.id}
              >
                <button
                  type="button"
                  className="vr-summary"
                  aria-expanded={open}
                  aria-controls={contentId}
                  onClick={() => onExpand(open ? null : verification.id)}
                >
                  <div className="vr-record-top">
                    <span className="vr-business-icon">
                      <Icon name="truck" />
                    </span>
                    <div className="vr-business-name">
                      <b>{verification.businessName}</b>
                      <small>
                        {verification.transporter.name} ·{" "}
                        {verification.transporter.email}
                      </small>
                    </div>
                    <span
                      className={`vr-badge ${replacement ? "vr-badge-red" : !pending.length && verification.status === "APPROVED" ? "vr-badge-green" : ""}`}
                    >
                      {replacement
                        ? "Replacement required"
                        : pending.length
                          ? "Pending review"
                          : label(verification.status)}
                    </span>
                    <span className="vr-chevron">
                      <Icon name="chevronDown" />
                    </span>
                  </div>
                  <div className="vr-facts">
                    <Fact
                      name="Company"
                      value={verification.companyNumber || "Not provided"}
                    />
                    <Fact
                      name="Documents"
                      value={`${docs.length} · ${pending.length ? `${pending.length} new upload${pending.length === 1 ? "" : "s"}` : rejected ? `${rejected} rejected` : `${docs.filter((d) => d.status === "APPROVED").length} approved`}`}
                      tone={pending.length ? "amber" : undefined}
                    />
                    <Fact
                      name="Insurance expiry"
                      value={verificationDate(insurance?.expiresAt)}
                    />
                    <Fact
                      name="Driving licence"
                      value={
                        !licence
                          ? "Not uploaded"
                          : licence.status === "PENDING"
                            ? "New upload · Pending"
                            : label(licence.status)
                      }
                      tone={
                        licence?.status === "PENDING"
                          ? "amber"
                          : licence?.status === "APPROVED"
                            ? "green"
                            : undefined
                      }
                    />
                    <Fact
                      name="Expiry alerts"
                      value={
                        expiredCount
                          ? `${expiredCount} expired`
                          : soon
                            ? `${soon} expiring soon`
                            : "No expiry warnings"
                      }
                      tone={expiredCount ? "red" : soon ? "amber" : "green"}
                    />
                    <Fact
                      name="Account"
                      value={label(account)}
                      tone={account === "ACTIVE" ? "green" : undefined}
                    />
                    <Fact
                      name="Work access"
                      value={
                        verification.transporter.workRestricted
                          ? "Restricted"
                          : "Permitted"
                      }
                    />
                    <Fact
                      name="Submitted"
                      value={
                        verification.submittedAt
                          ? verificationDate(verification.submittedAt)
                          : "Not submitted"
                      }
                    />
                    <Fact
                      name="Reviewed"
                      value={
                        verification.reviewedAt
                          ? verificationDate(verification.reviewedAt)
                          : "Not reviewed"
                      }
                    />
                  </div>
                </button>
                {open && (
                  <div className="vr-expanded" id={contentId}>
                    <h3 className="vr-section-label">
                      <Icon name="home" />
                      Business details
                    </h3>
                    <div className="vr-business">
                      <Fact
                        name="Business address"
                        value={verification.businessAddress || "Not provided"}
                      />
                      <Fact name="Phone" value={phone || "Not provided"} />
                      <Fact
                        name="Company number"
                        value={verification.companyNumber || "Not provided"}
                      />
                      <Fact
                        name="Years operating"
                        value={
                          verification.yearsOperating == null
                            ? "Not provided"
                            : `${verification.yearsOperating} years`
                        }
                      />
                      <Fact
                        name="Website"
                        value={verification.website || "Not provided"}
                      />
                      <Fact
                        name="Account status / work access"
                        value={`${label(account)} · ${verification.transporter.workRestricted ? "Restricted" : "Permitted"}`}
                      />
                    </div>
                    <div className="vr-actions">
                      {account !== "DELETED" && (
                        <>
                          <button
                            type="button"
                            className="vr-button vr-blue"
                            disabled={!!busy}
                            onClick={() => onMessage(verification)}
                          >
                            <Icon name="chat" />
                            Message
                          </button>
                          <a
                            className="vr-button"
                            href={`mailto:${verification.transporter.email}`}
                          >
                            <Icon name="mail" />
                            Email
                          </a>
                          {phone && (
                            <a
                              className="vr-button vr-call"
                              href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                            >
                              <Icon name="phone" />
                              Call
                            </a>
                          )}
                        </>
                      )}
                      {account === "ACTIVE" ? (
                        <button
                          type="button"
                          className="vr-button vr-push"
                          disabled={!!busy}
                          onClick={() =>
                            onAccountAction(verification, "SUSPEND")
                          }
                        >
                          Suspend account
                        </button>
                      ) : account === "SUSPENDED" ? (
                        <button
                          type="button"
                          className="vr-button vr-blue vr-push"
                          disabled={!!busy}
                          onClick={() =>
                            onAccountAction(verification, "REACTIVATE")
                          }
                        >
                          Reactivate account
                        </button>
                      ) : null}
                      {account !== "DELETED" && (
                        <button
                          type="button"
                          className="vr-button vr-danger"
                          disabled={!!busy}
                          onClick={() =>
                            onAccountAction(verification, "DELETE")
                          }
                        >
                          Remove account
                        </button>
                      )}
                    </div>
                    {!!pending.length && (
                      <div className="vr-upload-banner">
                        <div>
                          <strong>
                            {pending.length} new document
                            {pending.length === 1 ? "" : "s"} awaiting review
                          </strong>
                          <small>
                            Upload times are shown on each document. Previous
                            reviewed versions are shown separately below.
                          </small>
                        </div>
                        <span className="vr-new-label">
                          <Icon name="file" />
                          New uploads
                        </span>
                      </div>
                    )}
                    <h3 className="vr-section-label">
                      <Icon name="file" />
                      {pending.length
                        ? "New uploads to review"
                        : "Verification documents"}
                    </h3>
                    <div className="vr-docs">
                      {groups.map((group) =>
                        group.current.length ? (
                          group.current.map((document, index) => (
                            <DocumentCard
                              key={document.id}
                              document={document}
                              newest={document.id === group.newestId}
                              history={index === 0 ? group.history : []}
                              verification={verification}
                              reviewingDocument={reviewingDocument}
                              onDocumentReview={onDocumentReview}
                            />
                          ))
                        ) : (
                          <section
                            className="vr-doc vr-missing"
                            key={group.type}
                          >
                            <div className="vr-doc-head">
                              <span>
                                <Icon
                                  name={
                                    group.type === "INSURANCE"
                                      ? "shield"
                                      : "user"
                                  }
                                />
                                {documentTitle(group.type)}
                              </span>
                            </div>
                            <div className="vr-doc-body">Not uploaded</div>
                          </section>
                        ),
                      )}
                    </div>
                    {!!pending.length && (
                      <div className="vr-notice">
                        <Icon name="help" />
                        <div>
                          <b>New document review outstanding</b>
                          {pending.length === 1
                            ? "The new upload is"
                            : "The new uploads are"}{" "}
                          awaiting review. Each approve or reject button applies
                          only to the upload directly above it.
                        </div>
                      </div>
                    )}
                    {approvalBlocked && !pending.length && (
                      <div className="vr-notice">
                        <Icon name="alert" />
                        <div>
                          <b>Required document approval outstanding</b>Approve a
                          current insurance certificate and driving licence
                          before approving this account.
                        </div>
                      </div>
                    )}
                    {verification.status === "NOT_STARTED" ? (
                      <div className="vr-notice">
                        <Icon name="help" />
                        <div>
                          <b>Verification not started</b>This transporter has
                          not submitted business or verification details yet.
                        </div>
                      </div>
                    ) : (
                      <div className="vr-final-actions">
                        {verification.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              className="vr-button vr-blue"
                              disabled={approvalBlocked}
                              onClick={() =>
                                onReview(verification.id, "APPROVED")
                              }
                            >
                              <Icon name="shield" />
                              Approve & Verify
                            </button>
                            <button
                              type="button"
                              className="vr-button vr-danger"
                              onClick={() =>
                                onReview(verification.id, "REJECTED")
                              }
                            >
                              Reject verification
                            </button>
                          </>
                        )}
                        {verification.status !== "SUSPENDED" ? (
                          <button
                            type="button"
                            className="vr-button vr-push"
                            onClick={() =>
                              onReview(verification.id, "SUSPENDED")
                            }
                          >
                            Suspend verification
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="vr-button vr-blue"
                            disabled={approvalBlocked}
                            onClick={() =>
                              onReview(verification.id, "APPROVED")
                            }
                          >
                            Restore verification
                          </button>
                        )}
                      </div>
                    )}
                    {verification.reviewNote && (
                      <div className="vr-notice">
                        <Icon name="file" />
                        <div>
                          <b>Admin note</b>
                          {verification.reviewNote}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
