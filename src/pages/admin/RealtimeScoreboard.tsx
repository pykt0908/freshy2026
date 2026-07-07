import { useEffect, useState, useCallback } from 'react';
import { subscribeCompetitions } from '../../services/competitionService';
import { subscribeContestantsByCompetition } from '../../services/contestantService';
import { subscribeScoresByCompetitionAndRound } from '../../services/scoreService';
import { getJudgesByCompetition } from '../../services/userService';
import type { Competition, Contestant, Score, AppUser, ScoreboardEntry } from '../../types';

const RealtimeScoreboard = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [judges, setJudges] = useState<AppUser[]>([]);
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

    entries.sort((a, b) => b.totalScore - a.totalScore);

    // Assign ranks
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    const topN = currentRoundInfo?.topN ?? entries.length;

    // Step 1: Initialize all entries as not advanced and not tied
    entries.forEach((entry) => {
      entry.isAdvanced = false;
      entry.isTied = false;
    });

    // Step 2: Handle manual selections first (they always advance)
    let advancedCount = 0;
    entries.forEach((entry) => {
      if (entry.contestant.manuallySelected) {
        entry.isAdvanced = true;
        advancedCount++;
      }
    });

    // Step 3: Fill remaining slots with top contestants
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.isAdvanced) continue;

      if (advancedCount < topN) {
        const remainingSlots = topN - advancedCount;
        const targetIndex = i + remainingSlots - 1;
        
        if (targetIndex < entries.length - 1) {
          const boundaryScore = entries[targetIndex].totalScore;
          const nextScore = entries[targetIndex + 1].totalScore;
          
          if (boundaryScore === nextScore && entry.totalScore === boundaryScore && boundaryScore > 0) {
            const tiedEntries = entries.filter(e => e.totalScore === boundaryScore && !e.isAdvanced);
            tiedEntries.forEach(e => {
              e.isTied = true;
            });
            break;
          }
        }

        entry.isAdvanced = true;
        advancedCount++;
      } else {
        break;
      }
    }

    setScoreboard(entries);
  }, [contestants, scores, currentRoundInfo]);

  useEffect(() => {
    buildScoreboard();
  }, [buildScoreboard]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`space-y-4 ${isFullscreen ? 'p-5 bg-light min-h-screen' : ''}`}>
      {/* Page Header */}
      <div className="content-header p-0 mb-3 border-bottom pb-2 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 className="m-0 text-dark font-weight-bold" style={{ fontSize: '24px' }}>
            <i className="fas fa-chart-line text-primary mr-2"></i> กระดานคะแนน
          </h1>
          <p className="text-muted text-xs mb-0 mt-1 d-flex align-items-center gap-1.5 flex-wrap">
            <span>ประเภทประกวด: {selectedComp?.name} · รอบการประกวด: {currentRoundInfo?.name || `รอบที่ ${currentRound + 1}`}</span>
            {currentRoundInfo?.status === 'pending' && (
              <span className="badge badge-warning text-xxs font-weight-bold py-0.5 px-1.5">ยังไม่เริ่มให้คะแนน</span>
            )}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <select
            value={selectedCompId}
            onChange={(e) => setSelectedCompId(e.target.value)}
            className="form-control form-control-sm font-weight-bold"
            style={{ width: '180px', display: 'inline-block' }}
          >
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name}
              </option>
            ))}
          </select>
          <button
            onClick={toggleFullscreen}
            className="btn btn-default btn-sm font-weight-bold border-gray-300 shadow-xs"
          >
            {isFullscreen ? (
              <span><i className="fas fa-compress mr-1"></i> ออกจากเต็มจอ</span>
            ) : (
              <span><i className="fas fa-desktop mr-1"></i> แสดงแบบเต็มจอ (Projector)</span>
            )}
          </button>
        </div>
      </div>

      {/* Scoreboard Card */}
      <div className="card card-primary card-outline shadow-sm overflow-hidden bg-white border">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover mb-0 text-sm">
              <thead className="thead-light">
                <tr className="bg-light">
                  <th className="text-center w-16" style={{ width: '80px' }}>อันดับ</th>
                  <th style={{ width: '90px' }}>หมายเลข</th>
                  <th>ผู้เข้าประกวด</th>
                  {judges.map((j) => (
                    <th key={j.id} className="text-center">{j.displayName}</th>
                  ))}
                  <th className="text-center bg-blue-50/20" style={{ width: '120px' }}>คะแนนรวม</th>
                  <th className="text-center" style={{ width: '100px' }}>เฉลี่ย</th>
                  <th className="text-center" style={{ width: '120px' }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {scoreboard.map((entry) => (
                  <tr key={entry.contestant.id} className={entry.rank <= 3 ? 'table-warning-20' : ''}>
                    {/* Rank */}
                    <td className="text-center align-middle font-weight-extrabold text-dark" style={{ fontSize: '16px' }}>
                      {entry.rank}
                    </td>

                    {/* Number */}
                    <td className="align-middle font-weight-bold" style={{ fontSize: '16px' }}>
                      No. {entry.contestant.number}
                    </td>

                    {/* Contestant Image & details */}
                    <td className="align-middle">
                      <div className="d-flex align-items-center">
                        {entry.contestant.imageUrl ? (
                          <img
                            src={entry.contestant.imageUrl}
                            alt={entry.contestant.name}
                            className="img-circle border mr-2.5 shadow-sm"
                            style={{ width: '38px', height: '38px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="img-circle bg-light border text-muted d-flex align-items-center justify-content-center mr-2.5" style={{ width: '38px', height: '38px' }}>
                            <i className="fas fa-user-alt text-xs"></i>
                          </div>
                        )}
                        <div>
                          <span className="font-weight-bold text-dark" style={{ fontSize: '15px' }}>{entry.contestant.name}</span>
                          <div className="d-flex align-items-center mt-0.5 flex-wrap" style={{ gap: '6px' }}>
                            {entry.contestant.nickname && (
                              <small className="text-muted leading-none">ชื่อเล่น: "{entry.contestant.nickname}"</small>
                            )}
                            {entry.contestant.classroom && (
                              <>
                                <span className="text-muted text-xxs leading-none">|</span>
                                <small className="badge badge-light border text-secondary px-1.5 py-0.5 leading-none" style={{ fontSize: '9px' }}>
                                  ห้อง: {entry.contestant.classroom}
                                </small>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Judge scores */}
                    {judges.map((j) => {
                      const judgeScore = entry.judgeScores.find((s) => s.judgeId === j.id);
                      return (
                        <td key={j.id} className="text-center align-middle font-weight-bold text-secondary" style={{ fontSize: '15px' }}>
                          {judgeScore ? judgeScore.totalScore : <span className="text-muted font-light">—</span>}
                        </td>
                      );
                    })}

                    {/* Total score */}
                    <td className="text-center align-middle bg-blue-50/20">
                      <span className="font-weight-black text-primary" style={{ fontSize: '20px' }}>{entry.totalScore}</span>
                    </td>

                    {/* Average score */}
                    <td className="text-center align-middle font-weight-bold text-muted" style={{ fontSize: '15px' }}>
                      {entry.averageScore.toFixed(1)}
                    </td>

                    {/* Status */}
                    <td className="text-center align-middle">
                      {currentRoundInfo?.status === 'pending' ? (
                        <span className="text-muted font-light">—</span>
                      ) : entry.isTied ? (
                        <span className="badge badge-warning px-2 py-1" style={{ backgroundColor: '#fff3cd', borderColor: '#ffeeba', color: '#856404' }}><i className="fas fa-exclamation-triangle mr-1"></i> คะแนนเท่ากัน (รอตัดสิน)</span>
                      ) : entry.isManuallySelected ? (
                        <span className="badge badge-info px-2 py-1"><i className="fas fa-hand-paper mr-1"></i> ดึงผ่านพิเศษ</span>
                      ) : entry.isAdvanced ? (
                        <span className="badge badge-success px-2 py-1"><i className="fas fa-check mr-1"></i> ผ่านเข้ารอบ</span>
                      ) : (
                        <span className="text-muted font-light">—</span>
                      )}
                    </td>
                  </tr>
                ))}

                {scoreboard.length === 0 && (
                  <tr>
                    <td colSpan={6 + judges.length} className="text-center py-5 text-muted bg-white">
                      <div className="text-6xl text-gray-300 mb-2"><i className="fas fa-broadcast-tower"></i></div>
                      <h5 className="font-weight-bold text-dark mb-1">รอกรรมการลงคะแนน</h5>
                      <p className="text-xs mb-0">ยังไม่มีประวัติการส่งคะแนนสรุปจากกรรมการในรอบการประกวดนี้</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeScoreboard;
