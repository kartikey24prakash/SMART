import PDFDocument from "pdfkit";

import Certificate from "../model/Certificate.js";
import Event from "../model/Event.js";
import Registration from "../model/Registration.js";
import Team from "../model/Team.js";
import User from "../model/User.js";

const buildCertificateNumber = (eventId, participantId) =>
  `CERT-${eventId.toString().slice(-4)}-${participantId
    .toString()
    .slice(-4)}-${Date.now()}`;

const formatCertificateTypeLabel = (certificateType, rank) => {
  if (certificateType === "achievement" || certificateType === "winner") {
    if ([1, 2, 3].includes(Number(rank))) {
      return `Achievement Award — Rank ${rank}`;
    }
    return "Achievement Award";
  }
  return "Certificate of Participation";
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLOR = {
  black:       "#0A0A0A",
  darkGray:    "#1A1A1A",
  medGray:     "#4A4A4A",
  lightGray:   "#9A9A9A",
  ultraLight:  "#F5F5F5",
  white:       "#FFFFFF",
  gold:        "#C9A84C",
  goldLight:   "#E8D5A3",
  goldDark:    "#8B6914",
  accent:      "#1A1A2E",
  accentLight: "#E8E8F0",
  border:      "#D4C4A0",
};

const drawCertificateBackground = (doc) => {
  const { width, height } = doc.page;

  // ── Base background ────────────────────────────────────────
  doc.rect(0, 0, width, height).fill(COLOR.white);

  // ── Outer border ───────────────────────────────────────────
  doc.rect(24, 24, width - 48, height - 48)
    .lineWidth(3)
    .strokeColor(COLOR.gold)
    .stroke();

  // ── Inner border ───────────────────────────────────────────
  doc.rect(34, 34, width - 68, height - 68)
    .lineWidth(0.5)
    .strokeColor(COLOR.goldLight)
    .stroke();

  // ── Corner ornaments ───────────────────────────────────────
  const corners = [
    [24, 24],
    [width - 24, 24],
    [24, height - 24],
    [width - 24, height - 24],
  ];

  corners.forEach(([x, y]) => {
    doc.circle(x, y, 6)
      .fill(COLOR.gold);
    doc.circle(x, y, 10)
      .lineWidth(0.5)
      .strokeColor(COLOR.goldLight)
      .stroke();
  });

  // ── Top decorative band ────────────────────────────────────
  doc.rect(34, 34, width - 68, 80)
    .fill(COLOR.accent);

  // ── Bottom decorative band ─────────────────────────────────
  doc.rect(34, height - 114, width - 68, 80)
    .fill(COLOR.accent);

  // ── Center watermark diamond ───────────────────────────────
  doc.save();
  doc.translate(width / 2, height / 2);
  doc.rotate(45);
  doc.rect(-60, -60, 120, 120)
    .lineWidth(0.3)
    .strokeColor(COLOR.goldLight)
    .stroke();
  doc.rect(-40, -40, 80, 80)
    .lineWidth(0.3)
    .strokeColor(COLOR.goldLight)
    .stroke();
  doc.restore();

  // ── Horizontal rule center ─────────────────────────────────
  doc.moveTo(60, height / 2)
    .lineTo(width - 60, height / 2)
    .lineWidth(0.3)
    .strokeColor(COLOR.goldLight)
    .stroke();
};

const drawCertificateHeader = (doc) => {
  const { width } = doc.page;
  const bandTop = 34;

  // ── Organization name in top band ─────────────────────────
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLOR.goldLight)
    .text("SMART EVENT MANAGER", 0, bandTop + 16, {
      align: "center",
      characterSpacing: 5,
      width,
    });

  // ── Decorative line under org name ────────────────────────
  const lineY = bandTop + 34;
  doc
    .moveTo(width / 2 - 80, lineY)
    .lineTo(width / 2 - 10, lineY)
    .lineWidth(0.5)
    .strokeColor(COLOR.gold)
    .stroke();

  doc
    .moveTo(width / 2 + 10, lineY)
    .lineTo(width / 2 + 80, lineY)
    .lineWidth(0.5)
    .strokeColor(COLOR.gold)
    .stroke();

  // ── Diamond center ornament ────────────────────────────────
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLOR.gold)
    .text("◆", width / 2 - 5, lineY - 4, { width: 10, align: "center" });

  // ── Presented by line ──────────────────────────────────────
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLOR.lightGray)
    .text("EST. 2024  ·  EXCELLENCE IN EVENT MANAGEMENT", 0, bandTop + 46, {
      align: "center",
      characterSpacing: 2,
      width,
    });

  // ── Main certificate title ─────────────────────────────────
  doc
    .font("Times-Roman")
    .fontSize(52)
    .fillColor(COLOR.black)
    .text("Certificate", 0, 128, {
      align: "center",
      width,
    });

  // ── Subtitle ───────────────────────────────────────────────
  doc
    .font("Times-Italic")
    .fontSize(13)
    .fillColor(COLOR.medGray)
    .text("of Recognition and Achievement", 0, 186, {
      align: "center",
      width,
    });

  // ── Gold rule under title ──────────────────────────────────
  const ruleY = 210;
  doc
    .moveTo(width / 2 - 120, ruleY)
    .lineTo(width / 2 - 16, ruleY)
    .lineWidth(0.8)
    .strokeColor(COLOR.gold)
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLOR.gold)
    .text("✦", width / 2 - 8, ruleY - 6, { width: 16, align: "center" });

  doc
    .moveTo(width / 2 + 16, ruleY)
    .lineTo(width / 2 + 120, ruleY)
    .lineWidth(0.8)
    .strokeColor(COLOR.gold)
    .stroke();
};

const drawCertificateBody = (doc, certificate) => {
  const { width } = doc.page;

  const certificateTypeLabel = formatCertificateTypeLabel(
    certificate.certificateType,
    certificate.rank
  );
  const participantName  = certificate.participantId.name        || "Participant";
  const institution      = certificate.participantId.institution  || "Institution";
  const eventName        = certificate.eventId.name              || "Event";
  const eventDate        = certificate.eventId.eventDate
    ? new Date(certificate.eventId.eventDate).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "TBD";
  const venue = certificate.eventId.venue || "Venue to be announced";

  // ── Award type label ───────────────────────────────────────
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(COLOR.gold)
    .text(certificateTypeLabel.toUpperCase(), 0, 228, {
      align: "center",
      characterSpacing: 3,
      width,
    });

  // ── Presented to ───────────────────────────────────────────
  doc
    .font("Times-Italic")
    .fontSize(13)
    .fillColor(COLOR.lightGray)
    .text("This certificate is proudly presented to", 0, 252, {
      align: "center",
      width,
    });

  // ── Participant name ───────────────────────────────────────
  doc
    .font("Times-Bold")
    .fontSize(38)
    .fillColor(COLOR.black)
    .text(participantName, 80, 274, {
      align: "center",
      width: width - 160,
    });

  // ── Name underline ─────────────────────────────────────────
  const nameBottom = 274 + 42;
  doc
    .moveTo(width / 2 - 140, nameBottom)
    .lineTo(width / 2 + 140, nameBottom)
    .lineWidth(0.5)
    .strokeColor(COLOR.border)
    .stroke();

  // ── Institution ────────────────────────────────────────────
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(COLOR.medGray)
    .text(institution, 0, nameBottom + 10, {
      align: "center",
      width,
    });

  // ── Achievement line ───────────────────────────────────────
  const achievementLine =
    certificate.certificateType === "achievement" ||
    certificate.certificateType === "winner"
      ? `for earning Rank ${certificate.rank || "—"} in`
      : "for their active participation in";

  doc
    .font("Times-Italic")
    .fontSize(12)
    .fillColor(COLOR.medGray)
    .text(achievementLine, 0, nameBottom + 36, {
      align: "center",
      width,
    });

  // ── Event name ─────────────────────────────────────────────
  doc
    .font("Times-BoldItalic")
    .fontSize(22)
    .fillColor(COLOR.accent)
    .text(eventName, 80, nameBottom + 58, {
      align: "center",
      width: width - 160,
    });

  // ── Event details box ──────────────────────────────────────
  const boxTop  = nameBottom + 98;
  const boxW    = 340;
  const boxH    = 52;
  const boxX    = (width - boxW) / 2;

  // box background + border
  doc.rect(boxX, boxTop, boxW, boxH)
    .fill(COLOR.ultraLight);
  doc.rect(boxX, boxTop, boxW, boxH)
    .lineWidth(0.5)
    .strokeColor(COLOR.border)
    .stroke();

  // left vertical divider
  doc
    .moveTo(boxX + boxW / 2, boxTop + 8)
    .lineTo(boxX + boxW / 2, boxTop + boxH - 8)
    .lineWidth(0.5)
    .strokeColor(COLOR.border)
    .stroke();

  const colW    = boxW / 2;
  const labelY  = boxTop + 10;
  const valueY  = boxTop + 24;

  // Date column
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(COLOR.gold)
    .text("EVENT DATE", boxX + 12, labelY, { width: colW - 16, align: "left", characterSpacing: 1 });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLOR.darkGray)
    .text(eventDate, boxX + 12, valueY, { width: colW - 16, align: "left" });

  // Venue column
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(COLOR.gold)
    .text("VENUE", boxX + colW + 12, labelY, { width: colW - 16, align: "left", characterSpacing: 1 });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLOR.darkGray)
    .text(venue, boxX + colW + 12, valueY, { width: colW - 16, align: "left" });
};

const drawCertificateFooter = (doc, certificate) => {
  const { width, height } = doc.page;
  const bandTop = height - 114;

  const issuedOn = new Date(certificate.generatedAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
  const coordinatorName =
    certificate.generatedBy?.name ||
    certificate.eventId?.coordinators?.[0]?.name ||
    "Coordinator";

  // ── Issued on — just above the band ───────────────────────
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLOR.lightGray)
    .text(`Issued on ${issuedOn}`, 0, bandTop - 18, {
      align: "center",
      width,
    });

  // ── Signature lines inside bottom band ────────────────────
  const sigY        = bandTop + 22;
  const sigLineY    = bandTop + 44;
  const leftSigX    = width / 2 - 200;
  const rightSigX   = width / 2 + 40;
  const sigLineW    = 160;

  // Left signature — coordinator
  doc
    .moveTo(leftSigX, sigLineY)
    .lineTo(leftSigX + sigLineW, sigLineY)
    .lineWidth(0.5)
    .strokeColor(COLOR.gold)
    .stroke();

  doc
    .font("Times-Bold")
    .fontSize(11)
    .fillColor(COLOR.white)
    .text(coordinatorName, leftSigX, sigY, { width: sigLineW, align: "center" });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLOR.goldLight)
    .text("EVENT COORDINATOR", leftSigX, sigLineY + 6, {
      width: sigLineW,
      align: "center",
      characterSpacing: 1,
    });

  // Right signature — certificate number
  doc
    .moveTo(rightSigX, sigLineY)
    .lineTo(rightSigX + sigLineW, sigLineY)
    .lineWidth(0.5)
    .strokeColor(COLOR.gold)
    .stroke();

  doc
    .font("Times-Bold")
    .fontSize(9)
    .fillColor(COLOR.white)
    .text(certificate.certificateNumber, rightSigX, sigY + 4, {
      width: sigLineW,
      align: "center",
    });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLOR.goldLight)
    .text("CERTIFICATE NUMBER", rightSigX, sigLineY + 6, {
      width: sigLineW,
      align: "center",
      characterSpacing: 1,
    });

  // ── Bottom band footer text ────────────────────────────────
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(COLOR.goldLight)
    .text(
      "This certificate is digitally generated and valid without a physical signature.",
      0,
      bandTop + 62,
      { align: "center", width, characterSpacing: 0.5 }
    );
};

// ─── All logic below unchanged ────────────────────────────────────────────────

const assertCertificateEligibility = async ({
  participantId,
  eventId,
  certificateType,
  teamId,
  rank,
}) => {
  const event = await Event.findById(eventId);
  if (!event) {
    return { status: 404, message: "Event not found" };
  }

  if (event.participationType === "individual") {
    const registration = await Registration.findOne({ participantId, eventId });

    if (!registration) {
      return { status: 400, message: "Participant is not registered for this event" };
    }

    if (certificateType === "participation" && registration.status !== "participated") {
      return {
        status: 400,
        message: "Only participants marked as participated can receive participation certificates",
      };
    }

    if (
      ["achievement", "winner"].includes(certificateType) &&
      (!registration.isWinner || ![1, 2, 3].includes(Number(registration.rank)))
    ) {
      return {
        status: 400,
        message: "Only winner participants with rank 1, 2, or 3 can receive achievement certificates",
      };
    }

    return {
      event,
      resolvedRank: registration.rank,
      teamId: undefined,
    };
  }

  if (!teamId) {
    return { status: 400, message: "teamId is required for team event certificates" };
  }

  const team = await Team.findById(teamId);
  if (!team || team.eventId.toString() !== eventId.toString()) {
    return { status: 404, message: "Team not found for this event" };
  }

  const isMember = team.members.some((member) => member.userId.toString() === participantId.toString());
  if (!isMember) {
    return { status: 400, message: "Participant is not a member of this team" };
  }

  if (certificateType === "participation" && team.status !== "participated") {
    return {
      status: 400,
      message: "Only team members who actually participated can receive participation certificates",
    };
  }

  if (
    ["achievement", "winner"].includes(certificateType) &&
    (!team.isWinner || ![1, 2, 3].includes(Number(team.rank)))
  ) {
    return {
      status: 400,
      message: "Only winner teams with rank 1, 2, or 3 can receive achievement certificates",
    };
  }

  return {
    event,
    resolvedRank: team.rank,
    teamId: team._id,
  };
};

export const generateCertificate = async (req, res, next) => {
  try {
    const {
      participantId,
      eventId,
      certificateType = "participation",
      teamId,
      rank,
    } = req.body;

    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }

    const eligibility = await assertCertificateEligibility({
      participantId,
      eventId,
      certificateType,
      teamId,
      rank,
    });

    if (eligibility.message) {
      return res.status(eligibility.status).json({ message: eligibility.message });
    }

    const existing = await Certificate.findOne({ participantId, eventId, certificateType });
    if (existing) {
      return res.status(409).json({
        message: "Certificate already generated",
        certificate: existing,
      });
    }

    const certificate = await Certificate.create({
      certificateNumber: buildCertificateNumber(eligibility.event._id, participant._id),
      participantId,
      eventId,
      teamId: eligibility.teamId,
      certificateType,
      rank: eligibility.resolvedRank ?? rank,
      generatedBy: req.user._id,
    });

    res.status(201).json({ certificate });
  } catch (error) {
    next(error);
  }
};

export const downloadCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.certificateId)
      .populate("participantId", "name institution")
      .populate("eventId", "name eventDate venue coordinators")
      .populate("generatedBy", "name");

    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    const isOwner =
      certificate.participantId?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    const isEventCoordinator =
      req.user.role === "coordinator" &&
      (await Event.exists({
        _id: certificate.eventId._id,
        coordinators: req.user._id,
      }));

    if (!isOwner && !isAdmin && !isEventCoordinator) {
      return res.status(403).json({ message: "You are not authorized to download this certificate" });
    }

    certificate.downloadCount += 1;
    certificate.lastDownloadedAt = new Date();
    await certificate.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=certificate-${certificate.certificateNumber}.pdf`
    );

    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });
    doc.pipe(res);

    drawCertificateBackground(doc);
    drawCertificateHeader(doc);
    drawCertificateBody(doc, certificate);
    drawCertificateFooter(doc, certificate);

    doc.end();
  } catch (error) {
    next(error);
  }
};

export const getMyCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ participantId: req.user._id })
      .populate("eventId", "name eventDate")
      .sort({ createdAt: -1 });

    res.json({ certificates });
  } catch (error) {
    next(error);
  }
};

export const batchGenerateCertificates = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { certificateType = "participation" } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    let targets = [];

    if (event.participationType === "individual") {
      const registrations = await Registration.find({
        eventId,
        status: "participated",
      });

      targets = registrations
        .filter((registration) => {
          if (certificateType === "participation") {
            return registration.status === "participated";
          }
          if (certificateType === "achievement" || certificateType === "winner") {
            return registration.isWinner && [1, 2, 3].includes(Number(registration.rank));
          }
          return false;
        })
        .map((registration) => ({
          participantId: registration.participantId,
          rank: registration.rank,
        }));
    } else {
      const teams = await Team.find({
        eventId,
        status: "participated",
      });

      teams.forEach((team) => {
        if (
          (certificateType === "achievement" || certificateType === "winner") &&
          (!team.isWinner || ![1, 2, 3].includes(Number(team.rank)))
        ) {
          return;
        }

        team.members.forEach((member) => {
          targets.push({
            participantId: member.userId,
            teamId: team._id,
            rank: team.rank,
          });
        });
      });
    }

    let createdCount = 0;
    const skippedCount = 0;

    for (const target of targets) {
      const existing = await Certificate.findOne({
        participantId: target.participantId,
        eventId,
        certificateType,
      });

      if (existing) {
        continue;
      }

      await Certificate.create({
        certificateNumber: buildCertificateNumber(event._id, target.participantId),
        participantId: target.participantId,
        eventId,
        teamId: target.teamId,
        certificateType,
        rank: target.rank,
        generatedBy: req.user._id,
      });

      createdCount += 1;
    }

    res.json({
      message: "Batch certificate generation completed",
      createdCount,
      skippedCount: targets.length - createdCount,
      totalEligible: targets.length,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({
      certificateNumber: req.params.certificateNumber,
    })
      .populate("participantId", "name email studentId")
      .populate("eventId", "name eventDate venue");

    if (!certificate) {
      return res.status(404).json({ isValid: false, message: "Certificate not found" });
    }

    res.json({
      isValid: true,
      certificate,
    });
  } catch (error) {
    next(error);
  }
};