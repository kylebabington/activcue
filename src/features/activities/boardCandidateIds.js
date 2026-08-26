/** Candidate IDs currently on the results board (activities or scored entries). */
export function boardCandidateIds(boardItems = []) {
  const ids = [];
  for (const item of Array.isArray(boardItems) ? boardItems : []) {
    const activity = item?.activity || item;
    const id =
      activity?.candidateId ||
      activity?.candidate_id ||
      activity?.sharedCandidateId ||
      activity?.shared_candidate_id ||
      null;
    if (id) ids.push(String(id));
  }
  return [...new Set(ids)];
}
