const checkGenderRequirement = (users, requirement) => {
  if (!requirement || requirement === "none") {
    return true;
  }

  const genders = users.map((user) => user.gender);

  if (requirement === "at least 1 female") {
    return genders.includes("female");
  }

  if (requirement === "at least 1 male") {
    return genders.includes("male");
  }

  if (requirement === "mixed") {
    return genders.includes("male") && genders.includes("female");
  }

  return true;
};

export const validateTeamAgainstEvent = (users, event) => {
  const size = users.length;
  const minSize = event.teamConfig?.minTeamSize ?? 1;
  const maxSize = event.teamConfig?.maxTeamSize ?? minSize;

  const meetsTeamSizeRequirement = size >= minSize && size <= maxSize;
  const meetsGenderRequirement = checkGenderRequirement(
    users,
    event.teamConfig?.genderRequirement
  );

  return {
    meetsTeamSizeRequirement,
    meetsGenderRequirement,
  };
};
