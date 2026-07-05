import { useEffect, useState, useCallback } from 'react';
import { subscribeCompetitions, updateCompetition } from '../../services/competitionService';
import { subscribeContestantsByCompetition, eliminateContestant, advanceContestant, manuallySelectContestant } from '../../services/contestantService';
import { subscribeScoresByCompetitionAndRound } from '../../services/scoreService';
import { getJudgesByCompetition } from '../../services/userService';
import type { Competition, Contestant, Score, AppUser, ScoreboardEntry } from '../../types';
import toast from 'react-hot-toast';

const RoundManager = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [judges, setJudges] = useState<AppUser[]>([]);
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);

  const selectedComp = competitions.find((c) => c.id === selectedCompId);
  const currentRound = selectedComp?.currentRound ?? 0;
  const currentRoundInfo = selectedComp?.rounds?.[currentRound];

  useEffect(() => {
    const unsub = subscribeCompetitions(setCompetitions);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (competitions.length > 0 && !selectedCompId) {
      setSelectedCompId(competitions[0].id);
    }
  }, [competitions, selectedCompId]);

  useEffect(() => {
    if (!selectedCompId) return;
    const unsub = subscribeContestantsByCompetition(selectedCompId, setContestants);
    return () => unsub();
  }, [selectedCompId]);

  useEffect(() => {
    if (!selectedCompId) return;
    const unsub = subscribeScoresByCompetitionAndRound(selectedCompId, currentRound, setScores);
    return () => unsub();
  }, [selectedCompId, currentRound]);

  useEffect(() => {
    if (!selectedCompId) return;
    getJudgesByCompetition(selectedCompId).then(setJudges);
  }, [selectedCompId]);

  // Calculate scoreboard
  const buildScoreboard = useCallback(() => {
    const activeContestants = contestants.filter(
      (c) => c.eliminatedAtRound === null || c.eliminatedAtRound === undefined
    );

    const entries: ScoreboardEntry[] = activeContestants.map((contestant) => {
      const judgeScores = scores.filter((s) => s.contestantId === contestant.id);
      const totalScore = judgeScores.reduce((sum, s) => sum + s.totalScore, 0);
      const averageScore = judgeScores.length > 0 ? totalScore / judgeScores.length : 0;

      return {
        contestant,
        judgeScores,
        totalScore,
        averageScore,
        rank: 0,
        isAdvanced: false,
        isManuallySelected: contestant.manuallySelected || false,
      };
    });

    // Sort by total score descending
    entries.sort((a, b) => b.totalScore - a.totalScore);

    // Assign ranks and determine who advances
    const topN = currentRoundInfo?.topN ?? entries.length;
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
      entry.isAdvanced = idx < topN || entry.isManuallySelected;
    });

    setScoreboard(entries);
  }, [contestants, scores, currentRoundInfo]);

  useEffect(() => {
    buildScoreboard();
  }, [buildScoreboard]);

  const handleAdvanceRound = async () => {
    if (!selectedComp) return;
    if (!confirm('ต้องการประกาศผลและเลื่อนรอบการประกวดถัดไปหรือไม่? ผู้ที่ไม่ผ่านจะถูกตัดออกทันที')) return;

    // Eliminate contestants not in top N and not manually selected
    const toEliminate = scoreboard.filter((e) => !e.isAdvanced);
    for (const entry of toEliminate) {
      await eliminateContestant(entry.contestant.id, currentRound);
    }

    // Reset manually selected flags for advanced contestants
    const toAdvance = scoreboard.filter((e) => e.isAdvanced);
    for (const entry of toAdvance) {
      if (entry.isManuallySelected) {
        await advanceContestant(entry.contestant.id);
      }
    }

    // Update round status
    const updatedRounds = [...selectedComp.rounds];
    updatedRounds[currentRound] = { ...updatedRounds[currentRound], status: 'completed' };
    const nextRound = currentRound + 1;

    if (nextRound < updatedRounds.length) {
      updatedRounds[nextRound] = { ...updatedRounds[nextRound], status: 'active' };
      await updateCompetition(selectedCompId, { rounds: updatedRounds, currentRound: nextRound });
      toast.success('เลื่อนรอบการประกวดถัดไปเรียบร้อยแล้ว');
    } else {
      await updateCompetition(selectedCompId, { rounds: updatedRounds, status: 'completed' });
      toast.success('การประกวดของประเภทนี้เสร็จสิ้นอย่างเป็นทางการ!');
    }
  };

  const handleManualSelect = async (contestantId: string, currentlySelected: boolean) => {
    await manuallySelectContestant(contestantId, !currentlySelected);
    toast.success(!currentlySelected ? 'ผ่านเข้ารอบ (กรณีพิเศษ) สำเร็จ' : 'ยกเลิกสิทธิ์ผ่านเข้ารอบพิเศษสำเร็จ');
  };

  const judgeCount = judges.length;
  const totalPossibleScores =
    contestants.filter((c) => c.eliminatedAtRound === null || c.eliminatedAtRound === undefined).length * judgeCount;
  const totalScored = scores.length;
  const scorePercent = totalPossibleScores > 0 ? Math.round((totalScored / totalPossibleScores) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="content-header p-0 mb-3 border-bottom pb-2">
        <h1 className="m-0 text-dark font-weight-bold" style={{ fontSize: '24px' }}>จัดการรอบการประกวด</h1>
        <p className="text-muted text-sm mb-0">ควบคุมสถานะรอบการแข่งขัน และส่งรายชื่อผู้ผ่านเข้ารอบประกวดถัดไป</p>
      </div>

      {/* Competition Selector */}
      <div className="btn-group flex-wrap mb-3 shadow-xs" role="group">
        {competitions.map((comp) => (
          <button
            key={comp.id}
            onClick={() => setSelectedCompId(comp.id)}
            className={`btn btn-sm ${
              selectedCompId === comp.id ? 'btn-primary font-weight-bold' : 'btn-default bg-white text-secondary'
            } border-gray-200 px-4 py-2`}
          >
            {comp.name}
          </button>
        ))}
      </div>

      {selectedComp && (
        <>
          {/* Round Info Card */}
          <div className="card card-info card-outline shadow-sm p-4 bg-white border mb-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap pb-3 mb-3 border-bottom" style={{ gap: '15px' }}>
              <div>
                <h4 className="font-weight-bold text-dark mb-1" style={{ fontSize: '16px' }}>
                  รอบประกวด: {currentRoundInfo?.name || `รอบที่ ${currentRound + 1}`}
                  <span
                    className={`badge ml-2 px-2.5 py-1 ${
                      currentRoundInfo?.status === 'completed'
                        ? 'badge-primary'
                        : 'badge-success'
                    }`}
                    style={{ fontSize: '10px' }}
                  >
                    {currentRoundInfo?.status === 'completed'
                      ? <span><i className="fas fa-check-circle mr-1"></i> ตัดสินเสร็จสิ้น</span>
                      : <span><i className="fas fa-play-circle mr-1"></i> กำลังให้คะแนน</span>}
                  </span>
                </h4>
                <p className="text-muted text-xs mb-0">
                  เกณฑ์ผ่านรอบปกติ: คัดกรอง Top {currentRoundInfo?.topN} คนแรก · จำนวนกรรมการคัดสิน {judgeCount} คน · ให้คะแนนแล้ว {totalScored}/{totalPossibleScores} ใบผลลัพธ์
                </p>
              </div>
            </div>
          </div>

          {/* Scoreboard Table Card */}
          <div className="card card-primary card-outline shadow-sm overflow-hidden bg-white border">
            <div className="card-header d-flex justify-content-between align-items-center py-2.5 bg-gray-50/50">
              <h3 className="card-title font-weight-bold text-secondary m-0" style={{ fontSize: '15px' }}>
                <i className="fas fa-list-ol mr-1"></i> ตารางผลตัดสินผู้ประกวดเรียงลำดับคะแนน
              </h3>
              <span className="badge badge-success px-2 py-1 font-weight-bold d-flex align-items-center" style={{ fontSize: '10px', gap: '4px' }}>
                <span className="spinner-grow spinner-grow-sm text-light mr-1" role="status" style={{ width: '6px', height: '6px' }}></span>
                LIVE
              </span>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered table-striped table-hover mb-0 text-sm">
                  <thead className="thead-light">
                    <tr>
                      <th className="text-center w-16" style={{ width: '80px' }}>อันดับ</th>
                      <th style={{ width: '90px' }}>หมายเลข</th>
                      <th>ผู้เข้าประกวด</th>
                      {judges.map((j) => (
                        <th key={j.id} className="text-center">{j.displayName}</th>
                      ))}
                      <th className="text-center bg-blue-50/20" style={{ width: '100px' }}>คะแนนรวม</th>
                      <th className="text-center" style={{ width: '90px' }}>เฉลี่ย</th>
                      <th className="text-center" style={{ width: '120px' }}>สถานะตัดสิน</th>
                      <th className="text-center" style={{ width: '120px' }}>จัดการพิเศษ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreboard.map((entry) => (
                      <tr key={entry.contestant.id} className={entry.isAdvanced ? 'table-success-20' : ''}>
                        {/* Rank badge */}
                        <td className="text-center align-middle font-weight-extrabold text-dark">
                          {entry.rank}
                        </td>

                        {/* Number */}
                        <td className="align-middle font-weight-bold">
                          No. {entry.contestant.number}
                        </td>

                        {/* Contestant Image & Name */}
                        <td className="align-middle">
                          <div className="d-flex align-items-center">
                            {entry.contestant.imageUrl ? (
                              <img
                                src={entry.contestant.imageUrl}
                                alt={entry.contestant.name}
                                className="img-circle border mr-2.5 shadow-sm"
                                style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div className="img-circle bg-light border text-muted d-flex align-items-center justify-content-center mr-2.5" style={{ width: '32px', height: '32px' }}>
                                <i className="fas fa-user-alt text-xs"></i>
                              </div>
                            )}
                            <div>
                              <span className="font-weight-bold text-dark">{entry.contestant.name}</span>
                              <div className="d-flex align-items-center mt-0.5 flex-wrap" style={{ gap: '6px' }}>
                                {entry.contestant.nickname && (
                                  <small className="text-muted leading-none">ชื่อเล่น: "{entry.contestant.nickname}"</small>
                                )}
                                {entry.contestant.classroom && (
                                  <small className="badge badge-light border text-secondary px-1.5 py-0.5 leading-none" style={{ fontSize: '9px' }}>
                                    ห้อง: {entry.contestant.classroom}
                                  </small>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Scores */}
                        {judges.map((j) => {
                          const judgeScore = entry.judgeScores.find((s) => s.judgeId === j.id);
                          return (
                            <td key={j.id} className="text-center align-middle font-weight-bold text-secondary">
                              {judgeScore ? judgeScore.totalScore : <span className="text-muted font-light">—</span>}
                            </td>
                          );
                        })}

                        {/* Total score */}
                        <td className="text-center align-middle bg-blue-50/20 font-weight-black text-primary text-base">
                          {entry.totalScore}
                        </td>

                        {/* Average score */}
                        <td className="text-center align-middle font-weight-bold text-muted">
                          {entry.averageScore.toFixed(1)}
                        </td>

                        {/* Status */}
                        <td className="text-center align-middle">
                          {entry.isManuallySelected ? (
                            <span className="badge badge-info px-2.5 py-1.5"><i className="fas fa-hand-paper mr-1"></i> รอบพิเศษ</span>
                          ) : entry.isAdvanced ? (
                            <span className="badge badge-success px-2.5 py-1.5"><i className="fas fa-check mr-1"></i> ผ่านเข้ารอบ</span>
                          ) : (
                            <span className="badge badge-danger px-2.5 py-1.5"><i className="fas fa-times mr-1"></i> ไม่ผ่าน</span>
                          )}
                        </td>

                        {/* Wildcard toggle */}
                        <td className="text-center align-middle">
                          <button
                            onClick={() => handleManualSelect(entry.contestant.id, entry.isManuallySelected)}
                            className={`btn btn-xs font-weight-bold ${
                              entry.isManuallySelected ? 'btn-info text-white' : 'btn-outline-secondary bg-white'
                            } border shadow-xxs`}
                          >
                            {entry.isManuallySelected ? 'ยกเลิกพิเศษ' : <span><i className="fas fa-hand-paper mr-1"></i> ดึงผ่านเข้ารอบ</span>}
                          </button>
                        </td>
                      </tr>
                    ))}

                    {scoreboard.length === 0 && (
                      <tr>
                        <td colSpan={7 + judges.length} className="text-center py-5 text-muted">
                          <div className="text-5xl text-gray-300 mb-2"><i className="fas fa-clipboard-list"></i></div>
                          <h5 className="font-weight-bold text-dark mb-1">ยังไม่มีรายชื่อผู้เข้าประกวด</h5>
                          <p className="text-xs mb-0">กรุณาเพิ่มผู้เข้าประกวดหรือตรวจสอบสถานะการตัดสิน</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RoundManager;
