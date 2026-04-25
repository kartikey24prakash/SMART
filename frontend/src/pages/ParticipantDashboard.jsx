import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import DashboardShell from "../components/common/DashboardShell";
import useAuth from "../hooks/useAuth";
import {
  createTeam,
  getAvailableEvents,
  getCertificateDownloadUrl,
  getMyCertificates,
  getMyRegistrations,
  getMyTeams,
  registerForEvent,
  searchParticipants,
  withdrawRegistration,
  withdrawTeam,
} from "../services/participantService";

const formatDate = (value, fallback = "TBD") => {
  if (!value) {
    return fallback;
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatCertificateType = (value) => {
  if (value === "achievement") {
    return "Achievement";
  }

  if (value === "winner") {
    return "Winner";
  }

  return "Participation";
};

const statusStyles = {
  registered: "bg-blue-50 text-blue-700 border-blue-200",
  participated: "bg-emerald-50 text-emerald-700 border-emerald-200",
  withdrawn: "bg-rose-50 text-rose-700 border-rose-200",
  absent: "bg-amber-50 text-amber-700 border-amber-200",
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ongoing: "bg-violet-50 text-violet-700 border-violet-200",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
  draft: "bg-slate-100 text-slate-500 border-slate-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

function TeamModal({
  event,
  onClose,
  onCreate,
  searching,
  searchResults,
  onSearch,
  creating,
}) {
  const [teamName, setTeamName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [error, setError] = useState("");

  if (!event) {
    return null;
  }

  const addMember = (user) => {
    setSelectedMembers((current) => {
      if (current.some((member) => member._id === user._id)) {
        return current;
      }

      return [...current, user];
    });
    setStudentId("");
    setError("");
  };

  const removeMember = (memberId) => {
    setSelectedMembers((current) => current.filter((member) => member._id !== memberId));
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!studentId.trim()) {
      setError("Enter a student ID to search teammates.");
      return;
    }

    setError("");
    await onSearch(studentId.trim(), event._id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!teamName.trim()) {
      setError("Team name is required.");
      return;
    }

    setError("");

    try {
      await onCreate({
        eventId: event._id,
        teamName: teamName.trim(),
        members: selectedMembers.map((member) => member._id),
      });
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.3em] text-violet-600">
              Team Enrollment
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{event.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Build your team and submit it for this event.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                Team Name
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter a team name"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white"
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Add teammates</div>
                  <div className="text-xs text-slate-500">
                    Search by student ID. You are included automatically as team leader.
                  </div>
                </div>
                <div className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  {selectedMembers.length + 1} members total
                </div>
              </div>

              <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Search student ID"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-violet-300"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>

              <div className="space-y-3">
                {searchResults.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-400">
                    Search results will appear here.
                  </div>
                ) : (
                  searchResults.map((user) => {
                    const alreadyAdded = selectedMembers.some((member) => member._id === user._id);

                    return (
                      <div
                        key={user._id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-500">
                            {user.studentId} - {user.institution || "Institution not set"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addMember(user)}
                          disabled={alreadyAdded}
                          className="rounded-xl border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                        >
                          {alreadyAdded ? "Added" : "Add"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <div className="text-sm font-bold text-slate-900">Selected team</div>
              <div className="text-xs text-slate-500">
                Event rule: {event.teamConfig?.minTeamSize || 1} to{" "}
                {event.teamConfig?.maxTeamSize || 1} members
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Leader
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">You</div>
              </div>

              {selectedMembers.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{member.name}</div>
                    <div className="text-xs text-slate-500">{member.studentId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMember(member._id)}
                    className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={creating}
              className="mt-5 w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {creating ? "Creating team..." : "Create Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ParticipantDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, error: authError, signOut } = useAuth("participant");
  const [activeView, setActiveView] = useState("dashboard");
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [teamModalEvent, setTeamModalEvent] = useState(null);
  const [teamSearchLoading, setTeamSearchLoading] = useState(false);
  const [teamSearchResults, setTeamSearchResults] = useState([]);

  const loadParticipantData = async () => {
    setLoading(true);
    setError("");

    try {
      const [eventsData, registrationsData, teamsData, certificatesData] = await Promise.all([
        getAvailableEvents(),
        getMyRegistrations(),
        getMyTeams(),
        getMyCertificates(),
      ]);

      setEvents(eventsData.events || []);
      setRegistrations(registrationsData.registrations || []);
      setTeams(teamsData.teams || []);
      setCertificates(certificatesData.certificates || []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load participant dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const timer = setTimeout(() => {
      loadParticipantData();
    }, 0);

    return () => clearTimeout(timer);
  }, [user]);

  const activeRegistrations = useMemo(
    () => registrations.filter((registration) => registration.status !== "withdrawn"),
    [registrations]
  );

  const activeTeams = useMemo(
    () => teams.filter((team) => team.status !== "withdrawn"),
    [teams]
  );

  const enrolledEventIds = useMemo(() => {
    const ids = new Set();

    activeRegistrations.forEach((registration) => {
      ids.add(registration.eventId?._id || registration.eventId);
    });

    activeTeams.forEach((team) => {
      ids.add(team.eventId?._id || team.eventId);
    });

    return ids;
  }, [activeRegistrations, activeTeams]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const isAvailable = ["open", "ongoing"].includes(event.status);
      const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || event.eventType === typeFilter;
      return isAvailable && matchesSearch && matchesType;
    });
  }, [events, searchTerm, typeFilter]);

  const myEntries = useMemo(() => {
    const individualEntries = registrations.map((registration) => ({
      id: registration._id,
      kind: "individual",
      eventId: registration.eventId?._id || registration.eventId,
      eventName: registration.eventId?.name || "Event",
      eventDate: registration.eventId?.eventDate,
      venue: registration.eventId?.venue,
      status: registration.status,
      participationType: "individual",
      createdAt: registration.createdAt,
      isLeader: false,
    }));

    const teamEntries = teams.map((team) => ({
      id: team._id,
      kind: "team",
      eventId: team.eventId?._id || team.eventId,
      eventName: team.eventId?.name || "Event",
      eventDate: team.eventId?.eventDate,
      venue: team.eventId?.venue,
      status: team.status,
      participationType: "team",
      teamName: team.teamName,
      members: team.members,
      createdAt: team.createdAt,
      isLeader: team.leaderId?._id === user?._id,
    }));

    return [...individualEntries, ...teamEntries].sort(
      (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
    );
  }, [registrations, teams, user?._id]);

  const stats = useMemo(() => {
    const attendedIndividuals = registrations.filter(
      (registration) => registration.status === "participated"
    ).length;
    const attendedTeams = teams.filter((team) => team.status === "participated").length;

    return {
      active: activeRegistrations.length + activeTeams.length,
      attended: attendedIndividuals + attendedTeams,
      certificates: certificates.length,
    };
  }, [activeRegistrations.length, activeTeams.length, certificates.length, registrations, teams]);

  const handleRegister = async (event) => {
    setActionLoading(true);
    setError("");

    try {
      if (event.participationType === "team") {
        setTeamSearchResults([]);
        setTeamModalEvent(event);
        return;
      }

      await registerForEvent(event._id);
      await loadParticipantData();
      setActiveView("my-events");
    } catch (actionError) {
      setError(actionError.response?.data?.message || "Unable to register for event.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawRegistration = async (registrationId) => {
    setActionLoading(true);
    setError("");

    try {
      await withdrawRegistration(registrationId);
      await loadParticipantData();
    } catch (actionError) {
      setError(actionError.response?.data?.message || "Unable to withdraw registration.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawTeam = async (teamId) => {
    setActionLoading(true);
    setError("");

    try {
      await withdrawTeam(teamId);
      await loadParticipantData();
    } catch (actionError) {
      setError(actionError.response?.data?.message || "Unable to withdraw team.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTeamSearch = async (studentId, eventId) => {
    setTeamSearchLoading(true);

    try {
      const data = await searchParticipants(studentId, eventId);
      setTeamSearchResults(data.users || []);
    } catch (searchError) {
      setError(searchError.response?.data?.message || "Unable to search participants.");
      setTeamSearchResults([]);
    } finally {
      setTeamSearchLoading(false);
    }
  };

  const handleCreateTeam = async (payload) => {
    setActionLoading(true);
    setError("");

    try {
      await createTeam(payload);
      setTeamModalEvent(null);
      setTeamSearchResults([]);
      await loadParticipantData();
      setActiveView("my-events");
    } catch (actionError) {
      const message = actionError.response?.data?.message || "Unable to create team.";
      setError(message);
      throw new Error(message, { cause: actionError });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">
            Participant Workspace
          </div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Welcome back, {user?.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse live events, manage registrations, and download your certificates.
          </p>
        </div>
        <div className="rounded-3xl border border-blue-200 bg-blue-50 px-5 py-4">
          <div className="text-xs uppercase tracking-[0.2em] text-blue-600">Institution</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {user?.institution || "Not provided"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Active Enrollments", value: stats.active, tone: "from-blue-500 to-cyan-500" },
          { label: "Events Attended", value: stats.attended, tone: "from-emerald-500 to-teal-500" },
          { label: "Certificates", value: stats.certificates, tone: "from-violet-500 to-indigo-600" },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-3xl bg-gradient-to-br ${card.tone} p-5 text-white shadow-lg`}
          >
            <div className="text-sm font-medium text-white/80">{card.label}</div>
            <div className="mt-3 text-4xl font-black">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xl font-bold text-slate-900">Open Events</div>
              <div className="text-sm text-slate-500">
                Your next opportunities across technical, cultural, sports, and academic events.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveView("browse")}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
            >
              Browse all
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredEvents.slice(0, 4).map((event) => {
              const eventId = event._id;
              const enrolled = enrolledEventIds.has(eventId);

              return (
                <div key={eventId} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-slate-900">{event.name}</div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusStyles[event.status] || statusStyles.draft
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    {event.eventType} - {event.participationType} - {formatDate(event.eventDate)}
                  </div>
                  <button
                    type="button"
                    disabled={actionLoading || enrolled}
                    onClick={() => handleRegister(event)}
                    className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {enrolled
                      ? "Already Enrolled"
                      : event.participationType === "team"
                        ? "Create Team"
                        : "Register"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 text-xl font-bold text-slate-900">Recent Activity</div>
          <div className="space-y-3">
            {myEntries.slice(0, 5).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
                No registrations yet.
              </div>
            ) : (
              myEntries.slice(0, 5).map((entry) => (
                <div key={`${entry.kind}-${entry.id}`} className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{entry.eventName}</div>
                      <div className="text-xs text-slate-500">
                        {entry.kind === "team"
                          ? `${entry.teamName} - ${entry.members?.length || 0} members`
                          : "Individual registration"}
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusStyles[entry.status] || statusStyles.registered
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBrowse = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">Browse Events</div>
          <div className="text-sm text-slate-500">
            Search live events and enroll as an individual or a team.
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by event name"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-300"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300"
          >
            <option value="all">All types</option>
            <option value="technical">Technical</option>
            <option value="cultural">Cultural</option>
            <option value="sports">Sports</option>
            <option value="academic">Academic</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {filteredEvents.map((event) => {
          const enrolled = enrolledEventIds.has(event._id);
          const participantCount = event.stats?.totalParticipants || 0;

          return (
            <div key={event._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    statusStyles[event.status] || statusStyles.draft
                  }`}
                >
                  {event.status}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {event.eventType}
                </span>
              </div>

              <div className="mt-4 text-xl font-bold text-slate-900">{event.name}</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {event.description || "No description provided yet."}
              </p>

              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <div>Date: {formatDate(event.eventDate)}</div>
                <div>Venue: {event.venue || "TBD"}</div>
                <div>Mode: {event.participationType}</div>
                <div>Participants: {participantCount}</div>
              </div>

              {event.participationType === "team" ? (
                <div className="mt-4 rounded-2xl bg-violet-50 px-4 py-3 text-xs text-violet-700">
                  Team rule: {event.teamConfig?.minTeamSize || 1}-
                  {event.teamConfig?.maxTeamSize || 1} members
                  {event.teamConfig?.genderRequirement &&
                  event.teamConfig.genderRequirement !== "none"
                    ? ` - ${event.teamConfig.genderRequirement}`
                    : ""}
                </div>
              ) : null}

              <button
                type="button"
                disabled={actionLoading || enrolled}
                onClick={() => handleRegister(event)}
                className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {enrolled
                  ? "Already Enrolled"
                  : event.participationType === "team"
                    ? "Create Team"
                    : "Register Now"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMyEvents = () => (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-bold text-slate-900">My Registrations</div>
        <div className="text-sm text-slate-500">
          View your individual and team registrations in one place.
        </div>
      </div>

      {myEntries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-400">
          No registrations yet. Browse events to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {myEntries.map((entry) => (
            <div
              key={`${entry.kind}-${entry.id}`}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-lg font-bold text-slate-900">{entry.eventName}</div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusStyles[entry.status] || statusStyles.registered
                      }`}
                    >
                      {entry.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      {entry.participationType}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-500">
                    <div>Date: {formatDate(entry.eventDate)}</div>
                    <div>Venue: {entry.venue || "TBD"}</div>
                    {entry.kind === "team" ? (
                      <div>
                        Team: {entry.teamName} - {entry.members?.length || 0} members
                      </div>
                    ) : null}
                  </div>
                </div>

                {entry.status === "registered" ? (
                  entry.kind === "team" ? (
                    <button
                      type="button"
                      disabled={actionLoading || !entry.isLeader}
                      onClick={() => handleWithdrawTeam(entry.id)}
                      className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      {entry.isLeader ? "Withdraw Team" : "Leader Can Withdraw"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleWithdrawRegistration(entry.id)}
                      className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      Withdraw
                    </button>
                  )
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCertificates = () => (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-bold text-slate-900">My Certificates</div>
        <div className="text-sm text-slate-500">
          Download your participation and achievement certificates.
        </div>
      </div>

      {certificates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-400">
          No certificates available yet.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {certificates.map((certificate) => (
            <div key={certificate._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-700 p-5 text-white">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                  SMART Event Manager
                </div>
                <div className="mt-5 text-lg font-bold">
                  {certificate.eventId?.name || "Certificate"}
                </div>
                <div className="mt-2 text-sm text-white/75">
                  {formatCertificateType(certificate.certificateType)}
                  {certificate.rank ? ` - Rank ${certificate.rank}` : ""}
                </div>
                <div className="mt-6 text-xs text-white/60">{certificate.certificateNumber}</div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <div>Event date: {formatDate(certificate.eventId?.eventDate)}</div>
                <div>Generated: {formatDate(certificate.generatedAt)}</div>
              </div>

              <a
                href={getCertificateDownloadUrl(certificate._id)}
                className="mt-5 block rounded-2xl bg-violet-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                Download PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const views = {
    dashboard: renderDashboard(),
    browse: renderBrowse(),
    "my-events": renderMyEvents(),
    certificates: renderCertificates(),
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading participant workspace...
      </div>
    );
  }

  return (
    <>
      <DashboardShell
        role="participant"
        roleLabel="Participant"
        roleCaption="Student Event Hub"
        title={user?.institution || "Participant Dashboard"}
        subtitle="Track your enrollments, discover open events, and keep your certificates organized in one clean workspace."
        navItems={[
          { id: "dashboard", label: "Dashboard", sub: "Overview" },
          { id: "browse", label: "Browse Events", sub: "Explore live events" },
          { id: "my-events", label: "My Registrations", sub: "Track enrollments" },
          { id: "certificates", label: "My Certificates", sub: "Downloads" },
        ]}
        activeId={activeView}
        onSelect={setActiveView}
        user={user}
        error={error || authError}
        onLogout={handleLogout}
        headerBadge={`${stats.active} active enrollments`}
      >
        {views[activeView] || views.dashboard}
      </DashboardShell>

      {teamModalEvent ? (
        <TeamModal
          key={teamModalEvent._id}
          event={teamModalEvent}
          onClose={() => setTeamModalEvent(null)}
          onCreate={handleCreateTeam}
          searching={teamSearchLoading}
          searchResults={teamSearchResults}
          onSearch={handleTeamSearch}
          creating={actionLoading}
        />
      ) : null}
    </>
  );
}
