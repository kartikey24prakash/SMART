import Certificate from "../model/Certificate.js";
import Event from "../model/Event.js";
import Registration from "../model/Registration.js";
import Team from "../model/Team.js";
import User from "../model/User.js";

const activeRegistrationQuery = { status: { $ne: "withdrawn" } };
const activeTeamQuery = { status: { $ne: "withdrawn" } };

const buildTimelineBuckets = (items, dateKey = "createdAt") => {
  const buckets = new Map();

  items.forEach((item) => {
    const value = item?.[dateKey];
    if (!value) {
      return;
    }

    const date = new Date(value);
    const bucket = date.toISOString().slice(0, 10);
    buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
  });

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, count]) => ({ date, count }));
};

const toKeyValueBreakdown = (source) =>
  Object.entries(source)
    .sort((left, right) => right[1] - left[1])
    .map(([name, count]) => ({ name, count }));

const getAttendanceSummaryFromCollections = (registrations, teams) => {
  const attendance = {
    registeredIndividuals: 0,
    participatedIndividuals: 0,
    absentIndividuals: 0,
    registeredTeams: 0,
    participatedTeams: 0,
    absentTeams: 0,
    totalRegisteredPeople: 0,
    totalParticipatedPeople: 0,
    totalAbsentPeople: 0,
    participationRate: 0,
  };

  registrations.forEach((registration) => {
    if (registration.status === "registered") {
      attendance.registeredIndividuals += 1;
      attendance.totalRegisteredPeople += 1;
    }

    if (registration.status === "participated") {
      attendance.participatedIndividuals += 1;
      attendance.totalParticipatedPeople += 1;
    }

    if (registration.status === "absent") {
      attendance.absentIndividuals += 1;
      attendance.totalAbsentPeople += 1;
    }
  });

  teams.forEach((team) => {
    const memberCount = team.members.length;

    if (team.status === "registered") {
      attendance.registeredTeams += 1;
      attendance.totalRegisteredPeople += memberCount;
    }

    if (team.status === "participated") {
      attendance.participatedTeams += 1;
      attendance.totalParticipatedPeople += memberCount;
    }

    if (team.status === "absent") {
      attendance.absentTeams += 1;
      attendance.totalAbsentPeople += memberCount;
    }
  });

  const totalTrackedPeople =
    attendance.totalRegisteredPeople +
    attendance.totalParticipatedPeople +
    attendance.totalAbsentPeople;

  attendance.participationRate = totalTrackedPeople
    ? Number(((attendance.totalParticipatedPeople / totalTrackedPeople) * 100).toFixed(2))
    : 0;

  return attendance;
};

const buildParticipantBreakdowns = (registrations, teams) => {
  const gender = {};
  const institutions = {};
  const statusByGender = {};

  const recordParticipant = (participant, status) => {
    if (!participant) {
      return;
    }

    const genderKey = participant.gender || "Unknown";
    const institutionKey = participant.institution || "Unknown";

    gender[genderKey] = (gender[genderKey] || 0) + 1;
    institutions[institutionKey] = (institutions[institutionKey] || 0) + 1;

    if (!statusByGender[genderKey]) {
      statusByGender[genderKey] = {
        registered: 0,
        participated: 0,
        absent: 0,
      };
    }

    if (statusByGender[genderKey][status] !== undefined) {
      statusByGender[genderKey][status] += 1;
    }
  };

  registrations.forEach((registration) => {
    recordParticipant(registration.participantId, registration.status);
  });

  teams.forEach((team) => {
    team.members.forEach((member) => {
      recordParticipant(member.userId, team.status);
    });
  });

  return {
    gender,
    institutions,
    statusByGender,
  };
};

const buildCertificateSummary = (certificates, event, registrations, teams) => {
  let participationEligible = 0;
  let achievementEligible = 0;

  if (event.participationType === "individual") {
    participationEligible = registrations.filter(
      (registration) => registration.status === "participated"
    ).length;
    achievementEligible = registrations.filter(
      (registration) => registration.isWinner && [1, 2, 3].includes(Number(registration.rank))
    ).length;
  } else {
    participationEligible = teams
      .filter((team) => team.status === "participated")
      .reduce((sum, team) => sum + team.members.length, 0);

    achievementEligible = teams
      .filter((team) => team.isWinner && [1, 2, 3].includes(Number(team.rank)))
      .reduce((sum, team) => sum + team.members.length, 0);
  }

  const participationGenerated = certificates.filter(
    (certificate) => certificate.certificateType === "participation"
  ).length;
  const achievementGenerated = certificates.filter((certificate) =>
    ["achievement", "winner"].includes(certificate.certificateType)
  ).length;

  return {
    eligible: {
      participation: participationEligible,
      achievement: achievementEligible,
    },
    generated: {
      participation: participationGenerated,
      achievement: achievementGenerated,
    },
    pending: {
      participation: Math.max(participationEligible - participationGenerated, 0),
      achievement: Math.max(achievementEligible - achievementGenerated, 0),
    },
    totals: {
      all: certificates.length,
    },
  };
};

const buildWinnerSummary = (event, registrations, teams) => {
  const ranked = {
    1: null,
    2: null,
    3: null,
  };

  if (event.participationType === "individual") {
    registrations
      .filter((registration) => registration.isWinner && [1, 2, 3].includes(Number(registration.rank)))
      .forEach((registration) => {
        ranked[registration.rank] = {
          registrationId: registration._id,
          participant: registration.participantId,
          rank: registration.rank,
        };
      });
  } else {
    teams
      .filter((team) => team.isWinner && [1, 2, 3].includes(Number(team.rank)))
      .forEach((team) => {
        ranked[team.rank] = {
          teamId: team._id,
          teamName: team.teamName,
          leader: team.leaderId,
          rank: team.rank,
        };
      });
  }

  return {
    ranked,
    assignedRanks: Object.values(ranked).filter(Boolean).length,
    missingRanks: [1, 2, 3].filter((rank) => !ranked[rank]),
    complete: [1, 2, 3].every((rank) => Boolean(ranked[rank])),
  };
};

const buildTaskSummary = (event, attendance, certificateSummary, winnerSummary) => {
  const tasks = [];

  if (event.status !== "completed") {
    tasks.push({
      id: "complete-event",
      label: "Complete event",
      priority: event.status === "ongoing" ? "high" : "medium",
    });
  }

  if (attendance.totalParticipatedPeople === 0) {
    tasks.push({
      id: "mark-participation",
      label: "Mark participants or teams as participated",
      priority: "high",
    });
  }

  if (!winnerSummary.complete) {
    tasks.push({
      id: "declare-winners",
      label: "Declare 1st, 2nd, and 3rd place winners",
      priority: "medium",
    });
  }

  if (certificateSummary.pending.participation > 0) {
    tasks.push({
      id: "participation-certificates",
      label: "Generate remaining participation certificates",
      priority: "medium",
    });
  }

  if (certificateSummary.pending.achievement > 0) {
    tasks.push({
      id: "achievement-certificates",
      label: "Generate remaining achievement certificates",
      priority: "medium",
    });
  }

  return tasks;
};

const loadEventCollections = async (eventId) => {
  const [event, registrations, teams, certificates] = await Promise.all([
    Event.findById(eventId).populate("coordinators", "name email coordinatorId"),
    Registration.find({ eventId })
      .populate("participantId", "name email gender institution studentId contactNumber")
      .sort({ createdAt: -1 }),
    Team.find({ eventId })
      .populate("leaderId", "name email studentId contactNumber institution")
      .populate(
        "members.userId",
        "name email gender institution studentId contactNumber"
      )
      .sort({ createdAt: -1 }),
    Certificate.find({ eventId })
      .populate("participantId", "name email studentId")
      .sort({ createdAt: -1 }),
  ]);

  return { event, registrations, teams, certificates };
};

const buildEventDetail = async (event) => {
  const [registrations, teams] = await Promise.all([
    Registration.find({
      eventId: event._id,
      ...activeRegistrationQuery,
    }),
    Team.find({
      eventId: event._id,
      ...activeTeamQuery,
    }).select("members status"),
  ]);

  const teamParticipants = teams.reduce((sum, team) => sum + team.members.length, 0);
  const attendance = getAttendanceSummaryFromCollections(registrations, teams);

  return {
    _id: event._id,
    name: event.name,
    status: event.status,
    eventType: event.eventType,
    participationType: event.participationType,
    eventDate: event.eventDate,
    venue: event.venue,
    coordinators: event.coordinators,
    registrationsCount: registrations.length,
    teamsCount: teams.length,
    totalParticipants: registrations.length + teamParticipants,
    participatedCount: attendance.totalParticipatedPeople,
    absentCount: attendance.totalAbsentPeople,
  };
};

export const getOverviewAnalytics = async (_req, res, next) => {
  try {
    const [totalEvents, totalParticipants, totalRegistrations, totalTeams] =
      await Promise.all([
        Event.countDocuments(),
        User.countDocuments({ role: "participant" }),
        Registration.countDocuments(),
        Team.countDocuments(),
      ]);

    const [eventsByStatus, eventsByType, genderDistribution, coordinatorCount, eventDetails] =
      await Promise.all([
        Event.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Event.aggregate([{ $group: { _id: "$eventType", count: { $sum: 1 } } }]),
        User.aggregate([
          { $match: { role: "participant" } },
          { $group: { _id: "$gender", count: { $sum: 1 } } },
        ]),
        User.countDocuments({ role: "coordinator" }),
        Event.find()
          .populate("coordinators", "name email coordinatorId")
          .sort({ createdAt: -1 }),
      ]);

    const detailedEvents = await Promise.all(eventDetails.map(buildEventDetail));

    const coordinatorWorkloadMap = new Map();

    detailedEvents.forEach((event) => {
      event.coordinators.forEach((coordinator) => {
        const key = coordinator._id.toString();
        const current = coordinatorWorkloadMap.get(key) || {
          coordinator,
          events: [],
          totalParticipants: 0,
          activeEvents: 0,
          completedEvents: 0,
        };

        current.events.push({
          _id: event._id,
          name: event.name,
          status: event.status,
          participationType: event.participationType,
        });
        current.totalParticipants += event.totalParticipants;
        current.activeEvents += ["open", "ongoing"].includes(event.status) ? 1 : 0;
        current.completedEvents += event.status === "completed" ? 1 : 0;
        coordinatorWorkloadMap.set(key, current);
      });
    });

    res.json({
      totalEvents,
      totalParticipants,
      totalRegistrations,
      totalTeams,
      coordinatorCount,
      eventsByStatus,
      eventsByType,
      genderDistribution,
      eventDetails: detailedEvents,
      coordinatorWorkload: Array.from(coordinatorWorkloadMap.values()),
    });
  } catch (error) {
    next(error);
  }
};

export const getEventAnalytics = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { event, registrations, teams, certificates } = await loadEventCollections(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const breakdowns = buildParticipantBreakdowns(registrations, teams);
    const attendance = getAttendanceSummaryFromCollections(registrations, teams);
    const certificateSummary = buildCertificateSummary(certificates, event, registrations, teams);
    const winnerSummary = buildWinnerSummary(event, registrations, teams);

    res.json({
      event: {
        _id: event._id,
        name: event.name,
        participationType: event.participationType,
        status: event.status,
        coordinators: event.coordinators,
        eventDate: event.eventDate,
        venue: event.venue,
      },
      registrationsCount: registrations.length,
      teamsCount: teams.length,
      totalParticipants:
        registrations.length + teams.reduce((sum, team) => sum + team.members.length, 0),
      institutionBreakdown: breakdowns.institutions,
      genderBreakdown: breakdowns.gender,
      attendance,
      certificates: certificateSummary,
      winners: {
        individual: registrations.filter((item) => item.isWinner).length,
        team: teams.filter((item) => item.isWinner).length,
        summary: winnerSummary,
      },
      participantDetails: registrations,
      teamDetails: teams,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminEventsReport = async (_req, res, next) => {
  try {
    const events = await Event.find()
      .populate("coordinators", "name email coordinatorId")
      .sort({ createdAt: -1 });

    const report = await Promise.all(
      events.map(async (event) => {
        const [registrations, teams] = await Promise.all([
          Registration.find({ eventId: event._id })
            .populate("participantId", "name email studentId institution")
            .sort({ createdAt: -1 }),
          Team.find({ eventId: event._id })
            .populate("leaderId", "name email studentId")
            .populate("members.userId", "name email studentId institution")
            .sort({ createdAt: -1 }),
        ]);

        const attendance = getAttendanceSummaryFromCollections(registrations, teams);
        const teamParticipants = teams.reduce((sum, team) => sum + team.members.length, 0);

        return {
          _id: event._id,
          name: event.name,
          status: event.status,
          eventType: event.eventType,
          participationType: event.participationType,
          coordinators: event.coordinators,
          registrationsCount: registrations.filter((item) => item.status !== "withdrawn").length,
          teamsCount: teams.filter((item) => item.status !== "withdrawn").length,
          totalParticipants:
            registrations.filter((item) => item.status !== "withdrawn").length + teamParticipants,
          attendance,
          registrations,
          teams,
        };
      })
    );

    res.json({ events: report, count: report.length });
  } catch (error) {
    next(error);
  }
};

export const getCoordinatorSummary = async (req, res, next) => {
  try {
    const events = await Event.find({ coordinators: req.user._id })
      .populate("coordinators", "name email coordinatorId")
      .sort({ eventDate: 1, createdAt: -1 });

    const enrichedEvents = await Promise.all(events.map(buildEventDetail));

    const totals = enrichedEvents.reduce(
      (summary, event) => {
        summary.assignedEvents += 1;
        summary.totalParticipants += event.totalParticipants;
        summary.totalRegistrations += event.registrationsCount;
        summary.totalTeams += event.teamsCount;
        summary.participatedCount += event.participatedCount;
        summary.absentCount += event.absentCount;
        summary.byStatus[event.status] = (summary.byStatus[event.status] || 0) + 1;
        return summary;
      },
      {
        assignedEvents: 0,
        totalParticipants: 0,
        totalRegistrations: 0,
        totalTeams: 0,
        participatedCount: 0,
        absentCount: 0,
        byStatus: {
          draft: 0,
          open: 0,
          ongoing: 0,
          completed: 0,
          cancelled: 0,
        },
      }
    );

    const eventIds = enrichedEvents.map((event) => event._id);
    const [certificates, registrations, teams] = await Promise.all([
      Certificate.find({ eventId: { $in: eventIds } }).select("eventId certificateType"),
      Registration.find({ eventId: { $in: eventIds } }).select("eventId isWinner rank status"),
      Team.find({ eventId: { $in: eventIds } }).select("eventId isWinner rank status"),
    ]);

    const certificatesIssued = certificates.length;
    const pendingTasks = {
      incompleteEvents: enrichedEvents.filter((event) => event.status !== "completed").length,
      winnerDeclarationsPending: 0,
      certificateGenerationPending: 0,
    };

    enrichedEvents.forEach((event) => {
      const eventRegistrations = registrations.filter(
        (registration) => registration.eventId.toString() === event._id.toString()
      );
      const eventTeams = teams.filter((team) => team.eventId.toString() === event._id.toString());
      const eventCertificates = certificates.filter(
        (certificate) => certificate.eventId.toString() === event._id.toString()
      );

      const winnerSummary = buildWinnerSummary(
        event,
        eventRegistrations,
        eventTeams.map((team) => ({ ...team.toObject(), leaderId: null }))
      );

      if (!winnerSummary.complete) {
        pendingTasks.winnerDeclarationsPending += 1;
      }

      const certificateSummary = buildCertificateSummary(
        eventCertificates,
        event,
        eventRegistrations,
        eventTeams.map((team) => ({ ...team.toObject(), members: team.members || [] }))
      );

      if (
        certificateSummary.pending.participation > 0 ||
        certificateSummary.pending.achievement > 0
      ) {
        pendingTasks.certificateGenerationPending += 1;
      }
    });

    res.json({
      coordinator: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        coordinatorId: req.user.coordinatorId,
      },
      summary: {
        ...totals,
        certificatesIssued,
        participationRate:
          totals.totalParticipants > 0
            ? Number(((totals.participatedCount / totals.totalParticipants) * 100).toFixed(2))
            : 0,
      },
      pendingTasks,
      events: enrichedEvents,
    });
  } catch (error) {
    next(error);
  }
};

export const getEventAttendanceAnalytics = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { event, registrations, teams } = await loadEventCollections(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const attendance = getAttendanceSummaryFromCollections(registrations, teams);
    const timeline = buildTimelineBuckets(
      [
        ...registrations.map((registration) => ({
          createdAt: registration.createdAt,
          bucketType: "registration",
        })),
        ...teams.map((team) => ({
          createdAt: team.createdAt,
          bucketType: "team",
        })),
      ],
      "createdAt"
    );

    res.json({
      event: {
        _id: event._id,
        name: event.name,
        status: event.status,
        participationType: event.participationType,
      },
      attendance,
      registrationTimeline: timeline,
      statusBreakdown: [
        { name: "Registered", value: attendance.totalRegisteredPeople },
        { name: "Participated", value: attendance.totalParticipatedPeople },
        { name: "Absent", value: attendance.totalAbsentPeople },
      ],
    });
  } catch (error) {
    next(error);
  }
};

export const getEventCertificateAnalytics = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { event, registrations, teams, certificates } = await loadEventCollections(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const summary = buildCertificateSummary(certificates, event, registrations, teams);

    res.json({
      event: {
        _id: event._id,
        name: event.name,
        participationType: event.participationType,
        status: event.status,
      },
      summary,
      breakdown: [
        {
          name: "Participation",
          eligible: summary.eligible.participation,
          generated: summary.generated.participation,
          pending: summary.pending.participation,
        },
        {
          name: "Achievement",
          eligible: summary.eligible.achievement,
          generated: summary.generated.achievement,
          pending: summary.pending.achievement,
        },
      ],
      recentCertificates: certificates.slice(0, 10),
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminCoordinatorAnalytics = async (_req, res, next) => {
  try {
    const coordinators = await User.find({ role: "coordinator" })
      .select("name email coordinatorId institution")
      .sort({ createdAt: -1 });

    const analytics = await Promise.all(
      coordinators.map(async (coordinator) => {
        const events = await Event.find({ coordinators: coordinator._id })
          .select("name status eventDate participationType")
          .sort({ eventDate: 1, createdAt: -1 });

        const eventIds = events.map((event) => event._id);
        const [registrations, teams, certificates] = await Promise.all([
          Registration.find({ eventId: { $in: eventIds }, ...activeRegistrationQuery }).select(
            "eventId status isWinner rank"
          ),
          Team.find({ eventId: { $in: eventIds }, ...activeTeamQuery }).select(
            "eventId status members isWinner rank"
          ),
          Certificate.find({ eventId: { $in: eventIds } }).select("eventId"),
        ]);

        const participantsHandled =
          registrations.length +
          teams.reduce((sum, team) => sum + team.members.length, 0);
        const winnersDeclared =
          registrations.filter((registration) => registration.isWinner).length +
          teams.filter((team) => team.isWinner).length;

        return {
          coordinator,
          events,
          assignedEvents: events.length,
          activeEvents: events.filter((event) => ["open", "ongoing"].includes(event.status)).length,
          completedEvents: events.filter((event) => event.status === "completed").length,
          participantsHandled,
          teamsHandled: teams.length,
          certificatesGenerated: certificates.length,
          winnersDeclared,
        };
      })
    );

    res.json({
      coordinators: analytics,
      count: analytics.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getEventWinnerSummary = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { event, registrations, teams } = await loadEventCollections(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({
      event: {
        _id: event._id,
        name: event.name,
        participationType: event.participationType,
        status: event.status,
      },
      summary: buildWinnerSummary(event, registrations, teams),
    });
  } catch (error) {
    next(error);
  }
};

export const getEventBreakdowns = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { event, registrations, teams } = await loadEventCollections(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const breakdowns = buildParticipantBreakdowns(registrations, teams);

    res.json({
      event: {
        _id: event._id,
        name: event.name,
        participationType: event.participationType,
      },
      gender: {
        totals: breakdowns.gender,
        chart: toKeyValueBreakdown(breakdowns.gender),
        byStatus: breakdowns.statusByGender,
      },
      institutions: {
        totals: breakdowns.institutions,
        chart: toKeyValueBreakdown(breakdowns.institutions),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCoordinatorEventWorkspace = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { event, registrations, teams, certificates } = await loadEventCollections(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const attendance = getAttendanceSummaryFromCollections(registrations, teams);
    const certificateSummary = buildCertificateSummary(certificates, event, registrations, teams);
    const winnerSummary = buildWinnerSummary(event, registrations, teams);

    res.json({
      event: {
        _id: event._id,
        name: event.name,
        eventType: event.eventType,
        participationType: event.participationType,
        status: event.status,
        eventDate: event.eventDate,
        venue: event.venue,
        registrationStartDate: event.registrationStartDate,
        registrationEndDate: event.registrationEndDate,
        teamConfig: event.teamConfig,
        rules: event.rules,
        prizes: event.prizes,
        coordinators: event.coordinators,
      },
      attendance,
      certificates: certificateSummary,
      winners: winnerSummary,
      tasks: buildTaskSummary(event, attendance, certificateSummary, winnerSummary),
    });
  } catch (error) {
    next(error);
  }
};
