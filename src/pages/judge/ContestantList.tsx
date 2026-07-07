import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeContestantsByCompetition } from '../../services/contestantService';
import { subscribeCompetitions } from '../../services/competitionService';
import { getScoresByJudgeAndCompetition, subscribeScoresByCompetition } from '../../services/scoreService';
import type { Competition, Contestant, Score } from '../../types';

const ContestantList = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryRound = searchParams.get('round');
  
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'submit' | 'review'>('submit');
  const [allContestants, setAllContestants] = useState<Contestant[]>([]);
  const [allScores, setAllScores] = useState<Score[]>([]);

  useEffect(() => {
    if (queryRound !== null) {
      setSelectedRound(parseInt(queryRound, 10));
    } else if (competition) {
      setSelectedRound(competition.currentRound ?? 0);
    }
  }, [competition, queryRound]);

  const handleSelectRound = (idx: number) => {
    setSelectedRound(idx);
    setSearchParams({ round: idx.toString() });
  };

  useEffect(() => {
    if (!competitionId) return;
    const unsub = subscribeContestantsByCompetition(competitionId, setAllContestants);
    return () => unsub();
  }, [competitionId]);

  useEffect(() => {
    if (!competitionId) return;
    const unsub = subscribeScoresByCompetition(competitionId, setAllScores);
    return () => unsub();
  }, [competitionId]);

  useEffect(() => {
    const unsub = subscribeCompetitions((comps) => {
      const comp = comps.find((c) => c.id === competitionId);
      setCompetition(comp || null);
    });
    return () => unsub();
  }, [competitionId]);

  useEffect(() => {
    if (!competitionId) return;
    const unsub = subscribeContestantsByCompetition(competitionId, (all) => {
      // Filter out eliminated contestants based on the selected round
      const active = all.filter((c) => c.eliminatedAtRound === null || c.eliminatedAtRound === undefined || c.eliminatedAtRound >= selectedRound);
      setContestants(active);
    });
    return () => unsub();
  }, [competitionId, selectedRound]);

  const scoredIds = new Set(
    allScores
      .filter((s) => s.judgeId === appUser?.id && s.round === selectedRound)
      .map((s) => s.contestantId)
  );

  console.log('DEBUG ContestantList:', {
    currentJudgeId: appUser?.id,
    currentJudgeName: appUser?.displayName,
    allScores: allScores.map(s => ({ judgeId: s.judgeId, judgeName: s.judgeName, contestantId: s.contestantId, round: s.round })),
    scoredIds: Array.from(scoredIds)
  });

  const currentRoundInfo = competition?.rounds?.[selectedRound];
  const scorePercent = contestants.length > 0 ? Math.round((scoredIds.size / contestants.length) * 100) : 0;
  const isPending = currentRoundInfo?.status === 'pending';

  const renderReviewTab = () => {
    const rounds = competition?.rounds || [];
    const maxRoundIdx = competition?.currentRound ?? 0;
    
    const roundIndices = [];
    for (let i = maxRoundIdx; i >= 0; i--) {
      roundIndices.push(i);
    }

    return (
      <div className="space-y-4">
        {roundIndices.map((rIdx) => {
          const roundInfo = rounds[rIdx];
          if (!roundInfo) return null;

          const roundContestants = allContestants.filter(
            (c) => c.eliminatedAtRound === null || c.eliminatedAtRound === undefined || c.eliminatedAtRound >= rIdx
          );

          const roundScores = allScores.filter((s) => s.round === rIdx);
          
          const entries = roundContestants.map((contestant) => {
            const contestantScores = roundScores.filter((s) => s.contestantId === contestant.id);
            const totalScore = contestantScores.reduce((sum, s) => sum + s.totalScore, 0);
            const averageScore = contestantScores.length > 0 ? totalScore / contestantScores.length : 0;
            const myScore = contestantScores.find((s) => s.judgeId === appUser?.id);

            return {
              contestant,
              totalScore,
              averageScore,
              myScore,
              isAdvanced: false,
              rank: 0,
            };
          });

          const currentCompRound = competition?.currentRound ?? 0;
          const topN = roundInfo.topN ?? entries.length;

          entries.sort((a, b) => b.totalScore - a.totalScore);

          // Initialize properties and ranks
          entries.forEach((entry, idx) => {
            entry.rank = idx + 1;
            entry.isAdvanced = false;
            (entry as any).isTied = false;
          });

          if (rIdx < currentCompRound) {
            entries.forEach((entry) => {
              entry.isAdvanced = entry.contestant.eliminatedAtRound === null || entry.contestant.eliminatedAtRound > rIdx;
            });
          } else {
            // Live calculation with tie-breaker logic
            let advancedCount = 0;
            entries.forEach((entry) => {
              if (entry.contestant.manuallySelected) {
                entry.isAdvanced = true;
                advancedCount++;
              }
            });

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
                      (e as any).isTied = true;
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
          }

          return (
            <div key={rIdx} className="card card-outline card-info shadow-xs border bg-white mb-4">
              <div className="card-header bg-gray-50/50 py-2.5 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h5 className="m-0 font-weight-bold text-dark" style={{ fontSize: '15px' }}>
                  <i className="fas fa-layer-group text-info mr-1.5"></i> {roundInfo.name || `รอบที่ ${rIdx + 1}`}
                  <span className={`badge ml-2 px-2 py-0.5 text-xs ${
                    roundInfo.status === 'completed' 
                      ? 'badge-primary' 
                      : roundInfo.status === 'active'
                      ? 'badge-success'
                      : 'badge-secondary'
                  }`} style={{ fontSize: '10px' }}>
                    {roundInfo.status === 'completed' 
                      ? 'ปิดรับคะแนนแล้ว' 
                      : roundInfo.status === 'active'
                      ? 'กำลังเปิดให้คะแนน'
                      : 'ยังไม่เริ่มให้คะแนน'}
                  </span>
                </h5>
                <small className="text-muted font-weight-bold">
                  ผู้เข้าประกวดในรอบนี้: {roundContestants.length} คน
                </small>
              </div>

              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-bordered table-striped table-hover mb-0 text-sm">
                    <thead className="thead-light">
                      <tr className="bg-light">
                        <th className="text-center" style={{ width: '60px' }}>อันดับ</th>
                        <th style={{ width: '90px' }}>หมายเลข</th>
                        <th>ผู้เข้าประกวด</th>
                        <th className="text-center" style={{ width: '180px' }}>คะแนนของท่าน</th>
                        <th className="text-center" style={{ width: '100px' }}>คะแนนเฉลี่ย</th>
                        <th className="text-center" style={{ width: '100px' }}>คะแนนรวม</th>
                        <th className="text-center" style={{ width: '120px' }}>สถานะตัดสิน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => {
                        const activeCriteria = roundInfo.criteria?.length
                          ? roundInfo.criteria
                          : competition?.criteria || [];

                        return (
                          <tr key={entry.contestant.id}>
                            <td className="text-center align-middle font-weight-extrabold text-dark" style={{ fontSize: '14px' }}>
                              {roundInfo.status === 'pending' ? '—' : entry.rank}
                            </td>
                            <td className="align-middle font-weight-bold" style={{ fontSize: '14px' }}>No. {entry.contestant.number}</td>
                            <td className="align-middle font-weight-bold text-dark">{entry.contestant.name}</td>
                            <td className="align-middle text-center">
                              {roundInfo.status === 'pending' ? (
                                <span className="text-muted font-light">—</span>
                              ) : entry.myScore ? (
                                <div>
                                  <span className="font-weight-black text-primary" style={{ fontSize: '15px' }}>{entry.myScore.totalScore}</span>
                                  <div className="text-muted mt-0.5 d-flex flex-wrap justify-content-center gap-1.5" style={{ fontSize: '9.5px' }}>
                                    {activeCriteria.map((c) => (
                                      <span key={c.id} className="badge badge-light border text-secondary px-1.5 py-0.5">
                                        {c.name}: {entry.myScore?.scores?.[c.id] || 0}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="badge badge-warning px-2 py-1" style={{ fontSize: '10px' }}>ยังไม่ได้ลงคะแนน</span>
                              )}
                            </td>
                            <td className="text-center align-middle font-weight-bold text-secondary" style={{ fontSize: '14px' }}>
                              {roundInfo.status === 'pending' ? '—' : entry.averageScore.toFixed(1)}
                            </td>
                            <td className="text-center align-middle font-weight-bold text-primary" style={{ fontSize: '14px' }}>
                              {roundInfo.status === 'pending' ? '—' : entry.totalScore}
                            </td>
                            <td className="text-center align-middle">
                              {roundInfo.status === 'pending' ? (
                                <span className="text-muted font-light">—</span>
                              ) : (entry as any).isTied ? (
                                <span className="badge badge-warning px-2 py-1" style={{ fontSize: '10px', backgroundColor: '#fff3cd', borderColor: '#ffeeba', color: '#856404' }}><i className="fas fa-exclamation-triangle mr-1"></i> คะแนนเท่ากัน (รอตัดสิน)</span>
                              ) : entry.isAdvanced ? (
                                <span className="badge badge-success px-2 py-1" style={{ fontSize: '10px' }}><i className="fas fa-check mr-1"></i> ผ่านเข้ารอบ</span>
                              ) : (
                                <span className="badge badge-danger px-2 py-1" style={{ fontSize: '10px' }}><i className="fas fa-times mr-1"></i> ไม่ผ่าน</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {entries.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-4 text-muted bg-white">
                            ไม่มีรายชื่อผู้เข้าประกวดในรอบนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="card card-primary card-outline shadow-sm mt-3 bg-white">
      {/* Header card */}
      <div className="card-header py-4 px-4 bg-gray-50/50 border-bottom">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <button
            onClick={() => navigate('/judge')}
            className="btn btn-default btn-sm font-weight-bold border-gray-300 shadow-xs py-1.5 px-3.5"
            style={{ cursor: 'pointer' }}
          >
            <i className="fas fa-arrow-left mr-1"></i> ย้อนกลับ
          </button>
          <div className="text-right">
            <h4 className="font-weight-black text-primary mb-1 m-0" style={{ fontSize: '18px' }}>
              {competition?.name}
            </h4>
            {currentRoundInfo && (
              <small className="text-muted font-weight-bold">
                ประเมินแล้ว {scoredIds.size}/{contestants.length} คน ({scorePercent}%)
              </small>
            )}
          </div>
        </div>

        {/* Round Tabs */}
        {competition && competition.rounds && competition.rounds.length > 0 && (
          <div className="mt-4 pt-3 border-top">
            <h6 className="font-weight-bold text-dark text-sm mb-2"><i className="fas fa-layer-group text-primary mr-1"></i> เลือกรอบที่ต้องการให้คะแนน:</h6>
            <div className="d-flex flex-wrap gap-2">
              {competition.rounds.map((r, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectRound(idx)}
                  className={`btn btn-sm ${selectedRound === idx ? 'btn-primary font-weight-bold shadow-xs' : 'btn-default bg-white border-gray-300 text-secondary hover:bg-gray-50'} px-3`}
                  style={{ borderRadius: '4px' }}
                >
                  {r.name || `รอบที่ ${idx + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-4 pt-2 d-flex border-top" style={{ gap: '20px' }}>
          <button
            onClick={() => setActiveTab('submit')}
            className={`btn btn-link font-weight-bold pb-2 px-1 text-decoration-none border-0 ${
              activeTab === 'submit' ? 'text-primary animate-none' : 'text-secondary'
            }`}
            style={{ 
              borderBottom: activeTab === 'submit' ? '3px solid #007bff' : '3px solid transparent', 
              borderRadius: 0, 
              fontSize: '14.5px',
              backgroundColor: 'transparent'
            }}
          >
            <i className="fas fa-edit mr-1.5"></i> ลงคะแนนให้ผู้ประกวด
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`btn btn-link font-weight-bold pb-2 px-1 text-decoration-none border-0 ${
              activeTab === 'review' ? 'text-primary animate-none' : 'text-secondary'
            }`}
            style={{ 
              borderBottom: activeTab === 'review' ? '3px solid #007bff' : '3px solid transparent', 
              borderRadius: 0, 
              fontSize: '14.5px',
              backgroundColor: 'transparent'
            }}
          >
            <i className="fas fa-file-invoice mr-1.5"></i> ตรวจสอบผลคะแนนประกวด
          </button>
        </div>
      </div>

      {/* Contestant cards list */}
      <div className="card-body p-4">
        {activeTab === 'submit' ? (
          <>
            {isPending && (
              <div className="alert alert-warning mb-4 d-flex align-items-center" style={{ gap: '10px' }}>
                <i className="fas fa-exclamation-triangle text-lg"></i>
                <div>
                  <strong className="d-block text-sm">ยังไม่เปิดให้ลงคะแนนในรอบนี้</strong>
                  <span className="text-xs">กรุณารอผู้ดูแลระบบ (Admin) กดเริ่มให้คะแนนในรอบนี้ก่อนเริ่มการตัดสิน</span>
                </div>
              </div>
            )}
            {contestants.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <div className="text-5xl text-gray-300 mb-3"><i className="fas fa-user-friends"></i></div>
            <h5 className="font-weight-bold text-dark mb-1">ไม่พบรายชื่อผู้ประกวด</h5>
            <p className="text-muted text-xs mb-0">ยังไม่มีผู้เข้าประกวดของประเภทนี้ที่เข้ารอบในปัจจุบัน</p>
          </div>
        ) : (
          <div className="row">
            {contestants.map((contestant) => {
              const isScored = scoredIds.has(contestant.id);
              return (
                <div key={contestant.id} className="col-12 mb-3">
                  <button
                    onClick={() => {
                      if (!isScored && !isPending) {
                        navigate(`/judge/competition/${competitionId}/round/${selectedRound}/score/${contestant.id}`);
                      }
                    }}
                    disabled={isScored || isPending}
                    className={`btn btn-block text-left p-3 d-flex align-items-center justify-content-between border shadow-xxs transition-all ${
                      isScored 
                        ? 'bg-light border-gray-200 text-muted opacity-80' 
                        : isPending
                        ? 'bg-light border-gray-200 text-muted cursor-not-allowed opacity-75'
                        : 'bg-white border-gray-300 hover:border-primary hover:shadow-xs'
                    }`}
                    style={{ borderRadius: '6px', cursor: (isScored || isPending) ? 'default' : 'pointer', color: 'inherit' }}
                  >
                    <div className="d-flex align-items-center min-w-0 flex-grow-1">
                      {/* Thumbnail photo */}
                      {contestant.imageUrl ? (
                        <div className="mr-3 border rounded shadow-sm flex-shrink-0" style={{ width: '90px', height: '90px', overflow: 'hidden' }}>
                          <img src={contestant.imageUrl} alt={contestant.name} className="w-100 h-100" style={{ objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div
                          className={`img-circle d-flex align-items-center justify-content-center font-weight-bold mr-3 shadow-inner flex-shrink-0 ${
                            isScored ? 'bg-secondary text-white' : 'bg-blue-50 text-blue-700'
                          }`}
                          style={{ width: '90px', height: '90px', fontSize: '24px' }}
                        >
                          {contestant.number}
                        </div>
                      )}

                      <div className="min-w-0 flex-grow-1 ml-3">
                        <div className="font-weight-bold text-dark mb-1.5" style={{ fontSize: '18px' }}>
                          หมายเลข {contestant.number} &nbsp;&nbsp; {contestant.name}
                        </div>
                        <div className="text-secondary font-weight-semibold" style={{ fontSize: '14.5px' }}>
                          {contestant.nickname && `ชื่อเล่น: ${contestant.nickname}`}
                          {contestant.nickname && contestant.classroom && ` | `}
                          {contestant.classroom && `ห้องเรียน: ${contestant.classroom}`}
                        </div>
                      </div>
                    </div>

                    <div className="ml-2 flex-shrink-0">
                      {isScored ? (
                        <span className="badge badge-success px-2.5 py-1.5 font-weight-bold shadow-xxs">
                          <i className="fas fa-check-circle mr-1"></i> ลงคะแนนแล้ว
                        </span>
                      ) : isPending ? (
                        <span className="badge badge-secondary px-2.5 py-1.5 font-weight-bold shadow-xxs">
                          <i className="fas fa-lock mr-1"></i> ยังไม่เปิด
                        </span>
                      ) : (
                        <span className="badge badge-primary px-2.5 py-1.5 font-weight-bold shadow-xxs">
                          <i className="fas fa-pen mr-1"></i> ให้คะแนน
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
          </>
        ) : (
          renderReviewTab()
        )}
      </div>

      {activeTab === 'submit' && scoredIds.size === contestants.length && contestants.length > 0 && (
        <div className="card-footer bg-success-light text-center border-top border-success p-4">
          <div className="text-success text-3xl mb-2"><i className="fas fa-check-circle"></i></div>
          <h5 className="font-weight-bold text-success mb-1">ให้คะแนนครบถ้วนแล้ว!</h5>
          <p className="text-success text-xs mb-0">ขอบพระคุณเป็นอย่างยิ่งที่ท่านได้ทำผลการตัดสินแก่ผู้เข้าประกวดครบทุกคน</p>
        </div>
      )}
    </div>
  );
};

export default ContestantList;
