import { useEffect, useRef } from "react";

interface ClaimServiceLine {
  id?: number;
  lineNumber: number;
  dateOfServiceFrom: string | null;
  dateOfServiceTo: string | null;
  placeOfService: string | null;
  emg: boolean;
  procedureCode: string | null;
  modifier1: string | null;
  modifier2: string | null;
  modifier3: string | null;
  modifier4: string | null;
  diagnosisPointer: string | null;
  charges: number;
  units: number;
  epsdtFamilyPlan: string | null;
  idQualifier: string | null;
  renderingProviderNPI: string | null;
  renderingProviderIdNumber: string | null;
  revenueCode: string | null;
}

export interface CmsClaimPayload {
  id: number;
  claimNumber: string;
  organizationId: number | null;
  patientName: string;
  patientId: number | null;
  encounterId: number | null;
  serviceDate: string;
  submittedDate: string | null;
  amount: number;
  paidAmount: number | null;
  status: string;
  payer: string;
  denialReason: string | null;
  createdAt: string;
  updatedAt: string;

  // CMS-1500 Box 1
  insuranceType: string | null;
  // Box 1a
  insuredIdNumber: string | null;
  // Box 2 (from patient)
  // Box 3 (from patient DOB/gender)
  // Box 4
  insuredName: string | null;
  // Box 5 (from patient address)
  // Box 6
  patientRelationshipToInsured: string | null;
  // Box 7
  insuredAddress: string | null;
  insuredCity: string | null;
  insuredState: string | null;
  insuredZipCode: string | null;
  insuredPhone: string | null;
  // Box 8
  reservedNucc: string | null;
  // Box 9
  otherInsuredName: string | null;
  otherInsuredPolicyGroup: string | null;
  otherInsuredDob: string | null;
  otherInsuredSex: string | null;
  otherInsuredEmployerName: string | null;
  otherInsuredInsurancePlanName: string | null;
  // Box 10
  conditionRelatedToEmployment: boolean;
  conditionRelatedToAutoAccident: boolean;
  autoAccidentState: string | null;
  conditionRelatedToOtherAccident: boolean;
  // Box 10d
  claimCodes: string | null;
  // Box 11
  insuredPolicyGroupOrFecaNumber: string | null;
  insuredDob: string | null;
  insuredSex: string | null;
  insuredEmployerName: string | null;
  insuredInsurancePlanName: string | null;
  anotherHealthBenefitPlan: boolean;
  // Box 12
  patientSignature: string | null;
  patientSignatureDate: string | null;
  // Box 13
  insuredSignature: string | null;
  // Box 14
  dateOfCurrentIllness: string | null;
  illnessQualifier: string | null;
  // Box 15
  otherDate: string | null;
  otherDateQualifier: string | null;
  // Box 16
  unableToWorkFromDate: string | null;
  unableToWorkToDate: string | null;
  // Box 17
  referringProviderName: string | null;
  referringProviderOtherIdQualifier: string | null;
  referringProviderOtherId: string | null;
  referringProviderNPI: string | null;
  // Box 18
  hospitalizationFromDate: string | null;
  hospitalizationToDate: string | null;
  // Box 19
  additionalClaimInfo: string | null;
  // Box 20
  outsideLab: boolean;
  outsideLabCharges: number | null;
  // Box 21
  icdIndicator: string | null;
  diagnosisCodeA: string | null;
  diagnosisCodeB: string | null;
  diagnosisCodeC: string | null;
  diagnosisCodeD: string | null;
  diagnosisCodeE: string | null;
  diagnosisCodeF: string | null;
  diagnosisCodeG: string | null;
  diagnosisCodeH: string | null;
  diagnosisCodeI: string | null;
  diagnosisCodeJ: string | null;
  diagnosisCodeK: string | null;
  diagnosisCodeL: string | null;
  // Box 22
  resubmissionCode: string | null;
  originalRefNumber: string | null;
  // Box 23
  priorAuthorizationNumber: string | null;
  // Box 25
  billingProviderTaxId: string | null;
  billingProviderTaxIdType: string | null;
  // Box 26
  patientAccountNumber: string | null;
  // Box 27
  acceptAssignment: boolean;
  // Box 28 = amount
  // Box 29 = paidAmount
  // Box 31
  physicianSignature: string | null;
  physicianSignatureDate: string | null;
  // Box 32
  facilityName: string | null;
  facilityAddress: string | null;
  facilityCity: string | null;
  facilityState: string | null;
  facilityZipCode: string | null;
  facilityNPI: string | null;
  facilityOtherId: string | null;
  // Box 33
  billingProviderName: string | null;
  billingProviderAddress: string | null;
  billingProviderCity: string | null;
  billingProviderState: string | null;
  billingProviderZipCode: string | null;
  billingProviderPhone: string | null;
  billingProviderNPI: string | null;
  billingProviderOtherId: string | null;

  // Rendering provider
  renderingProviderNPI: string | null;
  renderingProviderName: string | null;

  // Institutional
  claimType: string | null;
  typeOfBill: string | null;
  admitDate: string | null;
  dischargeDate: string | null;

  // Service lines
  serviceLines: ClaimServiceLine[];

  // Relationships
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    medicareId: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    primaryDiagnosis: string | null;
    primaryDiagnosisDesc: string | null;
    attendingPhysicianName: string | null;
    attendingPhysicianNPI: string | null;
  } | null;
  organization: { id: number; name: string; slug: string } | null;
  encounter: {
    id: number;
    serviceDate: string;
    provider: string | null;
    diagnosisCodes: string | null;
    procedureCodes: string | null;
    notes: string | null;
  } | null;
}

function fmtDateMMDDYY(d: string | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return `${String(dt.getMonth() + 1).padStart(2, "0")} ${String(dt.getDate()).padStart(2, "0")} ${String(dt.getFullYear()).slice(-2)}`;
}

function fmtDateMMDDYYYY(d: string | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}/${dt.getFullYear()}`;
}

function chk(val: boolean | null | undefined): string {
  return val ? "X" : "";
}

export default function CMS1500Form({ claim }: { claim: CmsClaimPayload }) {
  const barcodeRef = useRef<HTMLCanvasElement>(null);
  const p = claim.patient;
  const lines = claim.serviceLines && claim.serviceLines.length > 0
    ? claim.serviceLines
    : [];

  // Fallback: fill diagnosis codes from encounter if claim-level not set
  const dxCodes: (string | null)[] = [
    claim.diagnosisCodeA, claim.diagnosisCodeB, claim.diagnosisCodeC, claim.diagnosisCodeD,
    claim.diagnosisCodeE, claim.diagnosisCodeF, claim.diagnosisCodeG, claim.diagnosisCodeH,
    claim.diagnosisCodeI, claim.diagnosisCodeJ, claim.diagnosisCodeK, claim.diagnosisCodeL,
  ];

  // If no claim-level dx codes, try encounter or patient
  if (dxCodes.every((d) => !d)) {
    const enc = claim.encounter;
    if (enc?.diagnosisCodes) {
      try {
        const parsed = JSON.parse(enc.diagnosisCodes) as string[];
        parsed.forEach((code, i) => { if (i < 12) dxCodes[i] = code; });
      } catch { /* ignore */ }
    } else if (p?.primaryDiagnosis) {
      dxCodes[0] = p.primaryDiagnosis;
    }
  }

  const insuranceType = claim.insuranceType || claim.payer || "";

  useEffect(() => {
    const canvas = barcodeRef.current;
    if (canvas) drawBarcode(canvas, claim.claimNumber);
  }, [claim.claimNumber]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cmsStyles }} />

      {/* Print toolbar */}
      <div className="no-print flex items-center gap-2 border-b border-slate-200 bg-slate-50 p-4 text-sm">
        <button onClick={() => window.print()} className="btn-primary">
          Print / Save as PDF
        </button>
        <button onClick={() => window.close()} className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50">
          Close
        </button>
        <span className="ml-auto self-center text-slate-500">
          {claim.claimNumber} &mdash; {claim.status.toUpperCase()}
        </span>
      </div>

      {/* =========== PAGE 1: CMS-1500 FORM =========== */}
      <div className="cms-page">

        {/* ---- HEADER ---- */}
        <div className="cms-header">
          <div className="cms-header-left">
            <canvas ref={barcodeRef} width={100} height={36} style={{ imageRendering: "pixelated" }} />
            <div className="barcode-text">{claim.claimNumber}</div>
          </div>
          <div className="cms-header-center">
            <div className="cms-title">HEALTH INSURANCE CLAIM FORM</div>
            <div className="cms-subtitle">APPROVED BY NATIONAL UNIFORM CLAIM COMMITTEE (NUCC) 08/05</div>
          </div>
          <div className="cms-header-right">
            <div className="pica-label">PICA</div>
            <div className="carrier-box">
              <div className="carrier-label">CARRIER</div>
              <div className="carrier-lines">
                <div className="carrier-line">&nbsp;</div>
                <div className="carrier-line">&nbsp;</div>
                <div className="carrier-line">&nbsp;</div>
              </div>
            </div>
          </div>
        </div>

        {/* ---- BOX 1 + 1a ---- */}
        <div className="cms-row row-top">
          <div className="cms-cell" style={{ flex: 5 }}>
            <div className="cell-label">1. &nbsp;
              <span className="chk-inline">{chk(insuranceType.toLowerCase().includes("medicare"))} MEDICARE</span>
              <span className="chk-sep">|</span>
              <span className="chk-inline">{chk(insuranceType.toLowerCase().includes("medicaid"))} MEDICAID</span>
              <span className="chk-sep">|</span>
              <span className="chk-inline">{chk(insuranceType.toLowerCase().includes("tricare"))} TRICARE</span>
              <span className="chk-sep">|</span>
              <span className="chk-inline">{chk(insuranceType.toLowerCase().includes("champva"))} CHAMPVA</span>
              <span className="chk-sep">|</span>
              <span className="chk-inline">{chk(insuranceType.toLowerCase().includes("group"))} GROUP HEALTH PLAN</span>
              <span className="chk-sep">|</span>
              <span className="chk-inline">{chk(insuranceType.toLowerCase().includes("feca") || insuranceType.toLowerCase().includes("black lung"))} FECA BLK LUNG</span>
              <span className="chk-sep">|</span>
              <span className="chk-inline">{chk(!["medicare", "medicaid", "tricare", "champva", "group", "feca"].some(t => insuranceType.toLowerCase().includes(t)) && !!insuranceType)} OTHER</span>
            </div>
          </div>
          <div className="cms-cell" style={{ flex: 2 }}>
            <div className="cell-label">1a. INSURED&apos;S I.D. NUMBER <span className="label-note">(For Program in Item 1)</span></div>
            <div className="cell-value mono">{claim.insuredIdNumber || p?.medicareId || ""}</div>
          </div>
        </div>

        {/* ---- BOX 2 + 3 + 4 ---- */}
        <div className="cms-row">
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">2. PATIENT&apos;S NAME (Last Name, First Name, Middle Initial)</div>
            <div className="cell-value">{p ? `${p.lastName}, ${p.firstName}` : claim.patientName}</div>
          </div>
          <div className="cms-cell" style={{ flex: 1.5 }}>
            <div className="cell-label">3. PATIENT&apos;S BIRTH DATE &nbsp;&nbsp; MM | DD | YY</div>
            <div className="cell-row">
              <span className="cell-value mono">{p ? fmtDateMMDDYY(p.dateOfBirth) : ""}</span>
              <span className="cell-label" style={{ marginLeft: 8 }}>SEX</span>
              <span className="chk-inline">{chk(p?.gender === "male" || p?.gender === "M")} M</span>
              <span className="chk-inline">{chk(p?.gender === "female" || p?.gender === "F")} F</span>
            </div>
          </div>
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">4. INSURED&apos;S NAME (Last Name, First Name, Middle Initial)</div>
            <div className="cell-value">{claim.insuredName || (p ? `${p.lastName}, ${p.firstName}` : "")}</div>
          </div>
        </div>

        {/* ---- BOX 5 + 6 + 7 (Address row 1) ---- */}
        <div className="cms-row">
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">5. PATIENT&apos;S ADDRESS (No., Street)</div>
            <div className="cell-value">{p?.address || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 1.5 }}>
            <div className="cell-label">6. PATIENT RELATIONSHIP TO INSURED</div>
            <div className="cell-row">
              <span className="chk-inline">{chk(claim.patientRelationshipToInsured === "self")} Self</span>
              <span className="chk-inline">{chk(claim.patientRelationshipToInsured === "spouse")} Spouse</span>
              <span className="chk-inline">{chk(claim.patientRelationshipToInsured === "child")} Child</span>
              <span className="chk-inline">{chk(claim.patientRelationshipToInsured === "other")} Other</span>
            </div>
          </div>
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">7. INSURED&apos;S ADDRESS (No., Street)</div>
            <div className="cell-value">{claim.insuredAddress || ""}</div>
          </div>
        </div>

        {/* ---- Address row 2: CITY + STATE ---- */}
        <div className="cms-row">
          <div className="cms-cell" style={{ flex: 1.5 }}>
            <div className="cell-label">CITY</div>
            <div className="cell-value">{p?.city || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 0.7 }}>
            <div className="cell-label">STATE</div>
            <div className="cell-value">{p?.state || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 1.5 }}>
            <div className="cell-label">8. RESERVED FOR NUCC USE</div>
            <div className="cell-value">{claim.reservedNucc || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 1.5 }}>
            <div className="cell-label">CITY</div>
            <div className="cell-value">{claim.insuredCity || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 0.7 }}>
            <div className="cell-label">STATE</div>
            <div className="cell-value">{claim.insuredState || ""}</div>
          </div>
        </div>

        {/* ---- Address row 3: ZIP + TELEPHONE ---- */}
        <div className="cms-row">
          <div className="cms-cell" style={{ flex: 1.2 }}>
            <div className="cell-label">ZIP CODE</div>
            <div className="cell-value mono">{p?.zipCode || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 1.2 }}>
            <div className="cell-label">TELEPHONE (Include Area Code)</div>
            <div className="cell-value mono">{p?.phone || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 1 }}>
            <div className="cell-label">&nbsp;</div>
            <div className="cell-value">&nbsp;</div>
          </div>
          <div className="cms-cell" style={{ flex: 1.2 }}>
            <div className="cell-label">ZIP CODE</div>
            <div className="cell-value mono">{claim.insuredZipCode || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 1.2 }}>
            <div className="cell-label">TELEPHONE (Include Area Code)</div>
            <div className="cell-value mono">{claim.insuredPhone || ""}</div>
          </div>
        </div>

        {/* ---- BOX 9 + 10 + 11 ---- */}
        <div className="cms-row">
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">9. OTHER INSURED&apos;S NAME (Last Name, First Name, Middle Initial)</div>
            <div className="cell-value">{claim.otherInsuredName || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 1.5 }}>
            <div className="cell-label">10. IS PATIENT&apos;S CONDITION RELATED TO:</div>
            <div className="cell-value">&nbsp;</div>
          </div>
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">11. INSURED&apos;S POLICY GROUP OR FECA NUMBER</div>
            <div className="cell-value">{claim.insuredPolicyGroupOrFecaNumber || ""}</div>
          </div>
        </div>

        {/* ---- 9a + 10a + 11a ---- */}
        <div className="cms-row">
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">a. OTHER INSURED&apos;S POLICY OR GROUP NUMBER</div>
            <div className="cell-value">{claim.otherInsuredPolicyGroup || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 1.5 }}>
            <div className="cell-label">a. EMPLOYMENT? (Current or Previous)</div>
            <div className="cell-row">
              <span className="chk-inline">{chk(claim.conditionRelatedToEmployment)} YES</span>
              <span className="chk-inline">{chk(!claim.conditionRelatedToEmployment)} NO</span>
            </div>
          </div>
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">a. INSURED&apos;S DATE OF BIRTH &nbsp;&nbsp; SEX</div>
            <div className="cell-row">
              <span className="cell-value mono">{fmtDateMMDDYY(claim.insuredDob)}</span>
              <span className="chk-inline" style={{ marginLeft: 6 }}>{chk(claim.insuredSex === "M")} M</span>
              <span className="chk-inline">{chk(claim.insuredSex === "F")} F</span>
            </div>
          </div>
        </div>

        {/* ---- 9b + 10b + 11b ---- */}
        <div className="cms-row">
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">b. RESERVED FOR NUCC USE</div>
            <div className="cell-value">&nbsp;</div>
          </div>
          <div className="cms-cell" style={{ flex: 1.5 }}>
            <div className="cell-label">b. AUTO ACCIDENT? &nbsp;&nbsp; PLACE (State)</div>
            <div className="cell-row">
              <span className="chk-inline">{chk(claim.conditionRelatedToAutoAccident)} YES</span>
              <span className="chk-inline">{chk(!claim.conditionRelatedToAutoAccident)} NO</span>
              <span className="cell-value mono" style={{ marginLeft: 4 }}>{claim.autoAccidentState || ""}</span>
            </div>
          </div>
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">b. OTHER CLAIM ID (Designated by NUCC)</div>
            <div className="cell-value">&nbsp;</div>
          </div>
        </div>

        {/* ---- 9c + 10c + 11c ---- */}
        <div className="cms-row">
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">c. RESERVED FOR NUCC USE</div>
            <div className="cell-value">&nbsp;</div>
          </div>
          <div className="cms-cell" style={{ flex: 1.5 }}>
            <div className="cell-label">c. OTHER ACCIDENT?</div>
            <div className="cell-row">
              <span className="chk-inline">{chk(claim.conditionRelatedToOtherAccident)} YES</span>
              <span className="chk-inline">{chk(!claim.conditionRelatedToOtherAccident)} NO</span>
            </div>
          </div>
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">c. INSURANCE PLAN NAME OR PROGRAM NAME</div>
            <div className="cell-value">{claim.insuredInsurancePlanName || ""}</div>
          </div>
        </div>

        {/* ---- 9d + 10d + 11d ---- */}
        <div className="cms-row">
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">d. INSURANCE PLAN NAME OR PROGRAM NAME</div>
            <div className="cell-value">{claim.otherInsuredInsurancePlanName || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 1.5 }}>
            <div className="cell-label">10d. CLAIM CODES (Designated by NUCC)</div>
            <div className="cell-value">{claim.claimCodes || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">d. IS THERE ANOTHER HEALTH BENEFIT PLAN?</div>
            <div className="cell-row">
              <span className="chk-inline">{chk(claim.anotherHealthBenefitPlan)} YES</span>
              <span className="chk-inline">{chk(!claim.anotherHealthBenefitPlan)} NO</span>
              <span className="cell-label" style={{ marginLeft: 4, fontSize: "5px" }}>If yes, complete items 9, 9a, and 9d.</span>
            </div>
          </div>
        </div>

        {/* ---- BOX 12 + 13 ---- */}
        <div className="cms-row sig-row">
          <div className="cms-cell" style={{ flex: 1 }}>
            <div className="cell-label">12. PATIENT&apos;S OR AUTHORIZED PERSON&apos;S SIGNATURE I authorize the release of any medical or other information necessary to process this claim. I also request payment of government benefits either to myself or to the party who accepts assignment below.</div>
            <div className="cell-row sig-line">
              <span className="cell-value sig-text">{claim.patientSignature || "SIGNATURE ON FILE"}</span>
              <span className="cell-label">DATE</span>
              <span className="cell-value mono">{fmtDateMMDDYYYY(claim.patientSignatureDate)}</span>
            </div>
          </div>
          <div className="cms-cell" style={{ flex: 1 }}>
            <div className="cell-label">13. INSURED&apos;S OR AUTHORIZED PERSON&apos;S SIGNATURE I authorize payment of medical benefits to the undersigned physician or supplier for services described below.</div>
            <div className="cell-value sig-text">{claim.insuredSignature || "SIGNATURE ON FILE"}</div>
          </div>
        </div>

        {/* ---- BOX 14 + 15 + 16 ---- */}
        <div className="cms-row">
          <div className="cms-cell" style={{ flex: 2 }}>
            <div className="cell-label">14. DATE OF CURRENT ILLNESS, INJURY, or PREGNANCY (LMP) &nbsp; QUAL.</div>
            <div className="cell-row">
              <span className="cell-value mono">{fmtDateMMDDYY(claim.dateOfCurrentIllness)}</span>
              <span className="cell-value mono" style={{ marginLeft: 4 }}>{claim.illnessQualifier || ""}</span>
            </div>
          </div>
          <div className="cms-cell" style={{ flex: 1.5 }}>
            <div className="cell-label">15. OTHER DATE &nbsp; QUAL.</div>
            <div className="cell-row">
              <span className="cell-value mono">{fmtDateMMDDYY(claim.otherDate)}</span>
              <span className="cell-value mono" style={{ marginLeft: 4 }}>{claim.otherDateQualifier || ""}</span>
            </div>
          </div>
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">16. DATES PATIENT UNABLE TO WORK IN CURRENT OCCUPATION</div>
            <div className="cell-row">
              <span className="cell-label">FROM</span>
              <span className="cell-value mono">{fmtDateMMDDYY(claim.unableToWorkFromDate)}</span>
              <span className="cell-label" style={{ marginLeft: 6 }}>TO</span>
              <span className="cell-value mono">{fmtDateMMDDYY(claim.unableToWorkToDate)}</span>
            </div>
          </div>
        </div>

        {/* ---- BOX 17 + 17a/17b ---- */}
        <div className="cms-row">
          <div className="cms-cell" style={{ flex: 3 }}>
            <div className="cell-label">17. NAME OF REFERRING PROVIDER OR OTHER SOURCE</div>
            <div className="cell-value">{claim.referringProviderName || p?.attendingPhysicianName || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 1.5 }}>
            <div className="cell-label">17a. <span className="cell-value mono">{claim.referringProviderOtherIdQualifier || ""}</span> &nbsp; <span className="cell-value mono">{claim.referringProviderOtherId || ""}</span></div>
            <div className="cell-label">17b. NPI</div>
            <div className="cell-value mono">{claim.referringProviderNPI || p?.attendingPhysicianNPI || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 2.5 }}>
            <div className="cell-label">18. HOSPITALIZATION DATES RELATED TO CURRENT SERVICES</div>
            <div className="cell-row">
              <span className="cell-label">FROM</span>
              <span className="cell-value mono">{fmtDateMMDDYY(claim.hospitalizationFromDate)}</span>
              <span className="cell-label" style={{ marginLeft: 6 }}>TO</span>
              <span className="cell-value mono">{fmtDateMMDDYY(claim.hospitalizationToDate)}</span>
            </div>
          </div>
        </div>

        {/* ---- BOX 19 + 20 ---- */}
        <div className="cms-row">
          <div className="cms-cell" style={{ flex: 4 }}>
            <div className="cell-label">19. ADDITIONAL CLAIM INFORMATION (Designated by NUCC)</div>
            <div className="cell-value" style={{ minHeight: 14 }}>{claim.additionalClaimInfo || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 2 }}>
            <div className="cell-label">20. OUTSIDE LAB? &nbsp;&nbsp; $ CHARGES</div>
            <div className="cell-row">
              <span className="chk-inline">{chk(claim.outsideLab)} YES</span>
              <span className="chk-inline">{chk(!claim.outsideLab)} NO</span>
              <span className="cell-value mono" style={{ marginLeft: 8 }}>$ {claim.outsideLabCharges != null ? claim.outsideLabCharges.toFixed(2) : ""}</span>
            </div>
          </div>
        </div>

        {/* ---- BOX 21: DIAGNOSIS ---- */}
        <div className="cms-section-bar">
          21. DIAGNOSIS OR NATURE OF ILLNESS OR INJURY. Relate A-L to service line below (24E)
          <span style={{ float: "right" }}>ICD Ind. <span className="icd-box">{claim.icdIndicator || "0"}</span></span>
        </div>
        <div className="dx-grid">
          {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map((letter, i) => (
            <div key={letter} className="dx-cell">
              <span className="dx-letter">{letter}.</span>
              <span className="dx-value mono">{dxCodes[i] || ""}</span>
            </div>
          ))}
        </div>

        {/* ---- BOX 22 + 23 ---- */}
        <div className="cms-row">
          <div className="cms-cell" style={{ flex: 1 }}>
            <div className="cell-label">22. RESUBMISSION CODE</div>
            <div className="cell-value mono">{claim.resubmissionCode || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 1 }}>
            <div className="cell-label">ORIGINAL REF. NO.</div>
            <div className="cell-value mono">{claim.originalRefNumber || ""}</div>
          </div>
          <div className="cms-cell" style={{ flex: 2 }}>
            <div className="cell-label">23. PRIOR AUTHORIZATION NUMBER</div>
            <div className="cell-value mono">{claim.priorAuthorizationNumber || ""}</div>
          </div>
        </div>

        {/* ---- BOX 24: SERVICE LINES TABLE ---- */}
        <table className="svc-table">
          <thead>
            <tr>
              <th className="svc-line-num">&nbsp;</th>
              <th colSpan={2} className="svc-date-hdr">
                A. DATE(S) OF SERVICE
                <div className="svc-sub-row">
                  <span>From</span><span>To</span>
                </div>
                <div className="svc-sub-row sub-fmt">
                  <span>MM DD YY</span><span>MM DD YY</span>
                </div>
              </th>
              <th>B.<br />PLACE OF<br />SERVICE</th>
              <th>C.<br />EMG</th>
              <th className="svc-cpt-hdr">
                D. PROCEDURES, SERVICES, OR SUPPLIES
                <div className="svc-sub-row sub-fmt">
                  <span>CPT/HCPCS</span>
                  <span>MODIFIER</span>
                </div>
              </th>
              <th>E.<br />DIAGNOSIS<br />POINTER</th>
              <th className="svc-charges-hdr">F.<br />$ CHARGES</th>
              <th>G.<br />DAYS<br />OR<br />UNITS</th>
              <th>H.<br />EPSDT<br />Family<br />Plan</th>
              <th>I.<br />ID.<br />QUAL.</th>
              <th className="svc-npi-hdr">J.<br />RENDERING<br />PROVIDER ID. #</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const line = lines[idx];
              const hasData = !!line;
              return (
                <tr key={idx} className={hasData ? "" : "empty-row"}>
                  <td className="svc-line-num">{idx + 1}</td>
                  <td className="mono svc-date">{hasData ? fmtDateMMDDYY(line.dateOfServiceFrom || claim.serviceDate) : ""}</td>
                  <td className="mono svc-date">{hasData ? fmtDateMMDDYY(line.dateOfServiceTo || line.dateOfServiceFrom || claim.serviceDate) : ""}</td>
                  <td className="mono center">{hasData ? (line.placeOfService || "12") : ""}</td>
                  <td className="mono center">{hasData && line.emg ? "Y" : ""}</td>
                  <td className="mono svc-cpt">
                    {hasData && (
                      <>
                        <span className="cpt-code">{line.procedureCode || ""}</span>
                        {line.modifier1 && <span className="mod">{line.modifier1}</span>}
                        {line.modifier2 && <span className="mod">{line.modifier2}</span>}
                        {line.modifier3 && <span className="mod">{line.modifier3}</span>}
                        {line.modifier4 && <span className="mod">{line.modifier4}</span>}
                      </>
                    )}
                  </td>
                  <td className="mono center">{hasData ? (line.diagnosisPointer || "A") : ""}</td>
                  <td className="mono amt">{hasData ? line.charges.toFixed(2) : ""}</td>
                  <td className="mono center">{hasData ? line.units : ""}</td>
                  <td className="mono center">{hasData ? (line.epsdtFamilyPlan || "") : ""}</td>
                  <td className="mono center">{hasData ? (line.idQualifier || "") : ""}</td>
                  <td className="mono">
                    {hasData && (
                      <>
                        <div className="npi-val">{line.renderingProviderNPI || claim.renderingProviderNPI || ""}</div>
                        {line.renderingProviderIdNumber && <div className="other-id">{line.renderingProviderIdNumber}</div>}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ---- BOX 25-30 ---- */}
        <div className="cms-row totals-row">
          <div className="cms-cell" style={{ flex: 1.5 }}>
            <div className="cell-label">25. FEDERAL TAX I.D. NUMBER</div>
            <div className="cell-row">
              <span className="cell-value mono">{claim.billingProviderTaxId || ""}</span>
              <span className="chk-inline" style={{ marginLeft: 6 }}>{chk(claim.billingProviderTaxIdType === "SSN")} SSN</span>
              <span className="chk-inline">{chk(claim.billingProviderTaxIdType !== "SSN")} EIN</span>
            </div>
          </div>
          <div className="cms-cell" style={{ flex: 1 }}>
            <div className="cell-label">26. PATIENT&apos;S ACCOUNT NO.</div>
            <div className="cell-value mono">{claim.patientAccountNumber || claim.claimNumber}</div>
          </div>
          <div className="cms-cell" style={{ flex: 0.8 }}>
            <div className="cell-label">27. ACCEPT ASSIGNMENT?</div>
            <div className="cell-row">
              <span className="chk-inline">{chk(claim.acceptAssignment)} YES</span>
              <span className="chk-inline">{chk(!claim.acceptAssignment)} NO</span>
            </div>
          </div>
          <div className="cms-cell total-cell" style={{ flex: 1 }}>
            <div className="cell-label">28. TOTAL CHARGE</div>
            <div className="cell-value mono total-amt">$ {claim.amount.toFixed(2)}</div>
          </div>
          <div className="cms-cell" style={{ flex: 0.8 }}>
            <div className="cell-label">29. AMOUNT PAID</div>
            <div className="cell-value mono">$ {(claim.paidAmount ?? 0).toFixed(2)}</div>
          </div>
          <div className="cms-cell" style={{ flex: 0.8 }}>
            <div className="cell-label">30. Rsvd for NUCC Use</div>
            <div className="cell-value">&nbsp;</div>
          </div>
        </div>

        {/* ---- BOX 31-33 ---- */}
        <div className="cms-row bottom-row">
          <div className="cms-cell" style={{ flex: 2 }}>
            <div className="cell-label">31. SIGNATURE OF PHYSICIAN OR SUPPLIER INCLUDING DEGREES OR CREDENTIALS (I certify that the statements on the reverse apply to this bill and are made a part thereof.)</div>
            <div className="cell-value sig-text">{claim.physicianSignature || p?.attendingPhysicianName || "SIGNATURE ON FILE"}</div>
            <div className="cell-sub">DATE &nbsp;{fmtDateMMDDYYYY(claim.physicianSignatureDate || claim.submittedDate || claim.createdAt)}</div>
          </div>
          <div className="cms-cell" style={{ flex: 2 }}>
            <div className="cell-label">32. SERVICE FACILITY LOCATION INFORMATION</div>
            <div className="cell-value">{claim.facilityName || claim.organization?.name || ""}</div>
            <div className="cell-sub">{claim.facilityAddress || ""}</div>
            <div className="cell-sub">{[claim.facilityCity, claim.facilityState, claim.facilityZipCode].filter(Boolean).join(", ")}</div>
            <div className="cell-row" style={{ marginTop: 2 }}>
              <span className="cell-label">a. NPI</span>
              <span className="cell-value mono">{claim.facilityNPI || ""}</span>
              <span className="cell-label" style={{ marginLeft: 6 }}>b.</span>
              <span className="cell-value mono">{claim.facilityOtherId || ""}</span>
            </div>
          </div>
          <div className="cms-cell" style={{ flex: 2 }}>
            <div className="cell-label">33. BILLING PROVIDER INFO &amp; PH # <span className="cell-value mono">{claim.billingProviderPhone || ""}</span></div>
            <div className="cell-value">{claim.billingProviderName || claim.organization?.name || ""}</div>
            <div className="cell-sub">{claim.billingProviderAddress || ""}</div>
            <div className="cell-sub">{[claim.billingProviderCity, claim.billingProviderState, claim.billingProviderZipCode].filter(Boolean).join(", ")}</div>
            <div className="cell-row" style={{ marginTop: 2 }}>
              <span className="cell-label">a. NPI</span>
              <span className="cell-value mono">{claim.billingProviderNPI || p?.attendingPhysicianNPI || ""}</span>
              <span className="cell-label" style={{ marginLeft: 6 }}>b.</span>
              <span className="cell-value mono">{claim.billingProviderOtherId || ""}</span>
            </div>
          </div>
        </div>

        {/* ---- FOOTER ---- */}
        <div className="cms-footer">
          <span>NUCC Instruction Manual available at: www.nucc.org</span>
          <span>PLEASE PRINT OR TYPE</span>
          <span>APPROVED OMB-0938-1197 FORM 1500 (02-12)</span>
        </div>
      </div>

      {/* =========== PAGE 2: LEGAL NOTICES =========== */}
      <div className="cms-page page-two">
        <div className="legal-content">
          <p className="legal-bold">BECAUSE THIS FORM IS USED BY VARIOUS GOVERNMENT AND PRIVATE HEALTH PROGRAMS, SEE SEPARATE INSTRUCTIONS ISSUED BY APPLICABLE PROGRAMS.</p>

          <p className="legal-notice">NOTICE: Any person who knowingly files a statement of claim containing any misrepresentation or any false, incomplete or misleading information may be guilty of a criminal act punishable under law and may be subject to civil penalties.</p>

          <p className="legal-heading">REFERS TO GOVERNMENT PROGRAMS ONLY</p>

          <p className="legal-text">MEDICARE AND CHAMPUS PAYMENTS: A patient&apos;s signature requests that payment be made and authorizes release of any information necessary to process the claim and certifies that the information provided in Blocks 1 through 12 is true, accurate and complete. In the case of a Medicare claim, the patient&apos;s signature authorizes any entity to release to Medicare medical and nonmedical information, including employment status, and whether the person has employer group health insurance, liability, no-fault, worker&apos;s compensation or other insurance which is responsible to pay for the services for which the Medicare claim is made. See 42 CFR 411.24(a). If item 9 is completed, the patient&apos;s signature authorizes release of the information to the health plan or agency shown. In Medicare assigned or CHAMPUS participation cases, the physician agrees to accept the charge determination of the Medicare carrier or CHAMPUS fiscal intermediary as the full charge, and the patient is responsible only for the deductible, coinsurance and noncovered services. Coinsurance and the deductible are based upon the charge determination of the Medicare carrier or CHAMPUS fiscal intermediary if this is less than the charge submitted. CHAMPUS is not a health insurance program but makes payment for health benefits provided through certain affiliations with the Uniformed Services. Information on the patient&apos;s sponsor should be provided in those items captioned in the form for &ldquo;ichured&rdquo;; i.e., items 1a, 4, 6, 7, 9, and 11.</p>

          <p className="legal-heading">BLACK LUNG AND FECA CLAIMS</p>

          <p className="legal-text">The provider agrees to accept the amount paid by the Government as payment in full. See Black Lung and FECA instructions regarding required fields.</p>

          <p className="legal-heading">SIGNATURE OF PHYSICIAN OR SUPPLIER (MEDICARE, CHAMPUS, FECA AND BLACK LUNG)</p>

          <p className="legal-text">I certify that the services shown on this form were medically indicated and necessary for the health of the patient and were personally furnished by me or were furnished incident to my professional service by my employee under my immediate personal supervision, except as otherwise expressly permitted by Medicare or CHAMPUS regulations.</p>

          <p className="legal-text">For services to be considered as &ldquo;incident&rdquo; to a physician&apos;s professional service, 1) they must be rendered under the physician&apos;s immediate personal supervision by his/her employee, 2) they must be an integral, although incidental part of a covered physician&apos;s service, 3) they must be of kinds commonly furnished in physician&apos;s offices, and 4) the services of nonphysicians must be included on the physician&apos;s bills.</p>

          <p className="legal-text">For CHAMPUS claims, I further certify that I (or any employee) who rendered services am not an active duty member of the Uniformed Services or a civilian employee of the United States Government or a contract employee of the United States Government, either civilian or military (refer to 5 USC 5536). For Black Lung claims, I further certify that the services performed were for a Black Lung related disorder.</p>

          <p className="legal-text">No Part B Medicare benefits may be paid unless this form is received as required by existing law and regulations (42 CFR 424.32).</p>

          <p className="legal-heading">NOTICE TO PATIENT ABOUT THE COLLECTION AND USE OF MEDICARE, CHAMPUS, FECA, AND BLACK LUNG INFORMATION (PRIVACY ACT STATEMENT)</p>

          <p className="legal-text">We are authorized by CMS, CHAMPUS and OWCP to ask you for information needed in the administration of the Medicare, CHAMPUS, FECA, and Black Lung programs. Authority to collect information is in section 205(a), ## 1## (a), 1## 2(a), 1## 5(b), and 1## 2(h)(i) of the Social Security Act as amended, 42 CFR 411.24(a) and 424.5(a) (6), and 44 USC 3101;41 CFR 101 et seq and 10 USC 1079 and 1086; 5 USC 8101 et seq; and 30 USC 901 et seq; 38 USC 613; E.O. 9397.</p>

          <p className="legal-text">The information we obtain to complete claims under these programs is used to identify you and to determine your eligibility. It is also used to decide if the services and supplies you received are covered by these programs and to insure that proper payment is made.</p>

          <p className="legal-text">The information may also be given to other providers of services, carriers, intermediaries, medical review boards, health plans, and other organizations or Federal agencies, for the effective administration of Federal provisions that require other third parties payers to pay primary to Federal program, and as otherwise necessary to administer these programs. For example, it may be necessary to disclose information about the benefits you have used to a hospital or doctor.</p>

          <p className="legal-text">With one exception, which is discussed below, there are no penalties under these programs for refusing to supply information. However, failure to furnish information regarding the medical services rendered or the amount charged would prevent payment of claims under these programs. Failure to furnish any other information, such as name or claim number, would delay the processing of the claim, and could possibly result in loss of benefits. It is mandatory that you tell us if you know that another party is responsible for paying for your treatment. Section 1128B of the Social Security Act and 31 USC 3801-3812 provide penalties for withholding this information.</p>

          <p className="legal-heading">MEDICAID PAYMENTS (PROVIDER CERTIFICATION)</p>

          <p className="legal-text">I hereby agree to keep such records as are necessary to disclose fully the extent of services provided to individuals under the State&apos;s Title XIX plan and to furnish information regarding any payments claimed for providing such services as the State Agency or Dept. of Health and Human Services may request.</p>

          <p className="legal-text">I further agree to accept, as payment in full, the amount paid by the Medicaid program for those claims submitted for payment under that program, with the exception of authorized deductible, coinsurance, co-payment or similar cost-sharing charge.</p>

          <p className="legal-heading">SIGNATURE OF PHYSICIAN (OR SUPPLIER)</p>

          <p className="legal-text">I certify that the services listed above were medically indicated and necessary to the health of this patient and were personally furnished by me or my employee under my personal direction.</p>

          <p className="legal-footer">NOTICE: This is to certify that the foregoing information is true, accurate and complete. I understand that payment and satisfaction of this claim will be from Federal and State funds, and that any false claims, statements, or documents, or concealment of a material fact, may be prosecuted under applicable Federal or State laws.</p>
        </div>
      </div>
    </>
  );
}

/** Draw a Code 128 style barcode on canvas from a string */
function drawBarcode(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";

  // Code 128B encoding
  const START_B = 104;

  // Code 128 bar patterns (each character = 6 bars: b s b s b s)
  const patterns: number[][] = [
    [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
    [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
    [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
    [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
    [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
    [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
    [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
    [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
    [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
    [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
    [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
    [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
    [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
    [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
    [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
    [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
    [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
    [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
    [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],
    [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
    [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],
    [2,1,1,2,3,2],[2,3,3,1,1,1,2],
  ];

  const stopPattern = [2, 3, 3, 1, 1, 1, 2];

  // Encode characters
  const values: number[] = [];
  let checksum = START_B;
  for (let i = 0; i < text.length; i++) {
    const val = text.charCodeAt(i) - 32;
    values.push(val);
    checksum += val * (i + 1);
  }
  checksum = checksum % 103;

  // Build full bar sequence
  const allPatterns: number[][] = [
    patterns[START_B] || [2,1,1,4,1,2],
    ...values.map((v) => patterns[v] || [1,1,1,1,1,1]),
    patterns[checksum] || [1,1,1,1,1,1],
  ];

  const barHeight = canvas.height - 6;
  const moduleWidth = 0.9;
  let x = 4;

  // Draw start + data + checksum
  for (const pattern of allPatterns) {
    for (let b = 0; b < pattern.length; b++) {
      const width = pattern[b] * moduleWidth;
      if (b % 2 === 0) {
        ctx.fillRect(x, 2, width, barHeight);
      }
      x += width;
    }
  }

  // Draw stop pattern
  for (let b = 0; b < stopPattern.length; b++) {
    const width = stopPattern[b] * moduleWidth;
    if (b % 2 === 0) {
      ctx.fillRect(x, 2, width, barHeight);
    }
    x += width;
  }
}

const cmsStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #d4d4d4; }

  :root {
    --cms-red: #C41E3A;
    --cms-red-lt: #E8B4BC;
    --cms-border: #C41E3A;
  }

  @media print {
    body { background: white; }
    .cms-page { box-shadow: none; margin: 0; padding: 0.15in 0.2in; width: 100%; }
    .no-print { display: none !important; }
    @page { size: letter; margin: 0.1in; }
    .page-two { page-break-before: always; }
  }

  @media screen {
    .page-two { margin-top: 40px; }
  }

  /* ---- Page ---- */
  .cms-page {
    width: 8.5in; min-height: 11in; margin: 20px auto; padding: 0.2in 0.25in;
    background: white; font-family: 'Arial Narrow', Arial, Helvetica, sans-serif;
    font-size: 7.5px; color: #1a1a1a; box-shadow: 0 4px 30px rgba(0,0,0,.25);
    position: relative;
  }

  /* ---- Header ---- */
  .cms-header {
    display: flex; align-items: flex-start; padding-bottom: 3px;
    border-bottom: 2px solid var(--cms-red); margin-bottom: 0;
  }
  .cms-header-left { display: flex; flex-direction: column; align-items: center; gap: 1px; min-width: 110px; }
  .barcode-text { font-size: 6px; font-family: 'Courier New', monospace; color: #333; letter-spacing: 0.5px; }
  .cms-header-center { flex: 1; text-align: center; padding-top: 4px; }
  .cms-title { font-size: 10px; font-weight: 900; color: var(--cms-red); letter-spacing: 1.5px; text-transform: uppercase; }
  .cms-subtitle { font-size: 5.5px; color: #888; margin-top: 1px; }
  .cms-header-right { min-width: 80px; text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .pica-label { font-size: 7px; font-weight: 900; color: var(--cms-red); letter-spacing: 1px; }
  .carrier-box { border: 1px solid var(--cms-red); padding: 2px 4px; margin-top: 2px; }
  .carrier-label { font-size: 6px; color: var(--cms-red); font-weight: 700; text-align: center; letter-spacing: 0.5px; }
  .carrier-lines { margin-top: 1px; }
  .carrier-line { border-bottom: 1px solid #ccc; height: 8px; width: 60px; }
  .carrier-line:last-child { border-bottom: none; }

  /* ---- Rows & Cells ---- */
  .cms-row {
    display: flex; border-left: 1px solid var(--cms-border); border-right: 1px solid var(--cms-border);
    border-bottom: 1px solid var(--cms-border);
  }
  .row-top { border-top: 1px solid var(--cms-border); }
  .cms-cell {
    flex: 1; padding: 1px 3px; border-right: 1px solid var(--cms-red-lt);
    min-height: 20px; position: relative;
  }
  .cms-cell:last-child { border-right: none; }

  .cell-label {
    font-size: 5px; color: var(--cms-red); text-transform: uppercase; font-weight: 700;
    line-height: 1.2; letter-spacing: 0.15px;
  }
  .label-note { font-weight: 400; font-size: 4.5px; }
  .cell-value { font-size: 8px; color: #000; font-weight: 600; line-height: 1.3; }
  .cell-sub { font-size: 6px; color: #555; line-height: 1.2; }
  .cell-row { display: flex; align-items: center; gap: 3px; flex-wrap: wrap; }
  .sig-text { font-style: italic; font-size: 7.5px; color: #333; }
  .sig-line { margin-top: 2px; padding-top: 2px; border-top: 1px solid #ccc; }
  .sig-row .cms-cell { min-height: 28px; }

  .mono { font-family: 'Courier New', monospace; }

  /* Checkboxes inline */
  .chk-inline { font-family: 'Courier New', monospace; font-weight: 800; font-size: 6.5px; margin: 0 2px; }
  .chk-sep { color: var(--cms-red); font-weight: 400; margin: 0 1px; font-size: 7px; }

  /* ---- Section bar ---- */
  .cms-section-bar {
    background: var(--cms-red); color: white; padding: 2px 5px; font-size: 6px;
    font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;
    border: 1px solid var(--cms-red); border-top: none;
  }
  .icd-box {
    display: inline-block; width: 12px; height: 10px; border: 1px solid white;
    text-align: center; font-size: 7px; font-weight: 900; line-height: 10px;
    margin-left: 3px; vertical-align: middle;
  }

  /* ---- Diagnosis grid ---- */
  .dx-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    border: 1px solid var(--cms-border); border-top: none;
  }
  .dx-cell {
    padding: 1px 3px; border-right: 1px solid var(--cms-red-lt);
    border-bottom: 1px solid var(--cms-red-lt); display: flex; align-items: center;
    gap: 3px; min-height: 14px;
  }
  .dx-cell:nth-child(4n) { border-right: none; }
  .dx-cell:nth-last-child(-n+4) { border-bottom: none; }
  .dx-letter { font-size: 6.5px; color: var(--cms-red); font-weight: 900; min-width: 10px; }
  .dx-value { font-size: 8px; font-weight: 700; }

  /* ---- Service lines table ---- */
  .svc-table {
    width: 100%; border-collapse: collapse;
    border: 1px solid var(--cms-border); border-top: none;
  }
  .svc-table th {
    font-size: 5px; text-transform: uppercase; color: var(--cms-red); font-weight: 700;
    padding: 1px 2px; text-align: center; border-bottom: 1.5px solid var(--cms-border);
    border-right: 1px solid var(--cms-red-lt); background: #FFF5F5;
    letter-spacing: 0.15px; line-height: 1.2; vertical-align: top;
  }
  .svc-table th:last-child { border-right: none; }
  .svc-date-hdr { min-width: 80px; }
  .svc-cpt-hdr { min-width: 100px; }
  .svc-charges-hdr { min-width: 55px; }
  .svc-npi-hdr { min-width: 60px; }
  .svc-sub-row { display: flex; justify-content: space-around; margin-top: 1px; }
  .sub-fmt { font-size: 4.5px; color: #999; font-weight: 400; }

  .svc-table td {
    padding: 2px 2px; border-bottom: 1px solid var(--cms-red-lt);
    border-right: 1px solid var(--cms-red-lt); font-size: 8px; height: 16px;
    vertical-align: middle;
  }
  .svc-table td:last-child { border-right: none; }
  .svc-table td.center { text-align: center; }
  .svc-table td.amt { text-align: right; font-weight: 700; padding-right: 4px; }
  .svc-table .empty-row td { color: transparent; }

  .svc-line-num { width: 14px !important; text-align: center; font-size: 6px; color: var(--cms-red); font-weight: 700; }
  .svc-date { min-width: 38px; text-align: center; font-size: 7px; }
  .svc-cpt { white-space: nowrap; }
  .cpt-code { font-weight: 800; color: #1e40af; margin-right: 4px; }
  .mod { font-size: 7px; color: #555; margin-right: 2px; }
  .mod::before { content: " "; }
  .npi-val { font-size: 7px; }
  .other-id { font-size: 5.5px; color: #777; }

  /* ---- Totals row ---- */
  .totals-row { border-top: 2px solid var(--cms-border); }
  .total-cell { background: #FFF5F5; }
  .total-amt { font-size: 10px; font-weight: 900; color: #000; }

  /* ---- Bottom row ---- */
  .bottom-row .cms-cell { min-height: 40px; }

  /* ---- Footer ---- */
  .cms-footer {
    display: flex; justify-content: space-between; padding: 3px 0; margin-top: 2px;
    border-top: 1px solid var(--cms-red); font-size: 5.5px; color: #888;
  }

  /* =================== PAGE 2: LEGAL =================== */
  .page-two { padding: 0.4in 0.5in; }
  .legal-content { color: var(--cms-red); font-size: 7.5px; line-height: 1.5; }
  .legal-bold { font-weight: 900; font-size: 8px; margin-bottom: 10px; text-transform: uppercase; }
  .legal-notice { font-weight: 700; font-size: 7.5px; margin-bottom: 10px; border: 1px solid var(--cms-red); padding: 6px; }
  .legal-heading { font-weight: 900; font-size: 7.5px; margin-top: 10px; margin-bottom: 4px; text-transform: uppercase; text-decoration: underline; }
  .legal-text { font-size: 7px; margin-bottom: 6px; text-align: justify; }
  .legal-footer { font-weight: 700; font-size: 7px; margin-top: 12px; border-top: 1px solid var(--cms-red); padding-top: 6px; }
`;
