import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeContestantsByCompetition } from '../../services/contestantService';
import { subscribeCompetitions } from '../../services/competitionService';
import { getScoresByJudgeAndCompetition } from '../../services/scoreService';
import type { Competition, Contestant, Score } from '../../types';

const ContestantList = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [scoredIds, setScoredIds] = useState<Set<string>>(new Set());
  const [selectedRound, setSelectedRound] = useState<number>(0);

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

  useEffect(() => {
    if (!appUser || !competitionId || !competition) return;
    getScoresByJudgeAndCompetition(appUser.id, competitionId, selectedRound).then((scores: Score[]) => {
      setScoredIds(new Set(scores.map((s) => s.contestantId)));
    });
  }, [appUser, competitionId, competition, selectedRound]);

  const currentRoundInfo = competition?.rounds?.[selectedRound];
  const scorePercent = contestants.length > 0 ? Math.round((scoredIds.size / contestants.length) * 100) : 0;

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
                  onClick={() => setSelectedRound(idx)}
                  className={`btn btn-sm ${selectedRound === idx ? 'btn-primary font-weight-bold shadow-xs' : 'btn-default bg-white border-gray-300 text-secondary hover:bg-gray-50'} px-3`}
                  style={{ borderRadius: '4px' }}
                >
                  {r.name || `รอบที่ ${idx + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contestant cards list */}
      <div className="card-body p-4">
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
                      if (!isScored) {
                        navigate(`/judge/competition/${competitionId}/round/${selectedRound}/score/${contestant.id}`);
                      }
                    }}
                    disabled={isScored}
                    className={`btn btn-block text-left p-3 d-flex align-items-center justify-content-between border shadow-xxs transition-all ${
                      isScored 
                        ? 'bg-light border-gray-200 text-muted opacity-80' 
                        : 'bg-white border-gray-300 hover:border-primary hover:shadow-xs'
                    }`}
                    style={{ borderRadius: '6px', cursor: isScored ? 'default' : 'pointer', color: 'inherit' }}
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
      </div>

      {scoredIds.size === contestants.length && contestants.length > 0 && (
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
