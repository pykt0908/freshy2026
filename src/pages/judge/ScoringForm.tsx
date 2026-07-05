import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeContestantsByCompetition } from '../../services/contestantService';
import { subscribeCompetitions } from '../../services/competitionService';
import { submitScore, getScoresByJudgeAndCompetition } from '../../services/scoreService';
import type { Competition, Contestant, Score } from '../../types';
import toast from 'react-hot-toast';

const ScoringForm = () => {
  const { competitionId, roundIndex, contestantId } = useParams<{ competitionId: string; roundIndex: string; contestantId: string }>();
  const parsedRound = parseInt(roundIndex || '0', 10);
  const { appUser } = useAuth();
  const navigate = useNavigate();

  const [contestant, setContestant] = useState<Contestant | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [scoreValues, setScoreValues] = useState<Record<string, number>>({});
  const [alreadyScored, setAlreadyScored] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!competitionId || !contestantId) return;
    const unsub = subscribeContestantsByCompetition(competitionId, (all) => {
      const target = all.find((c) => c.id === contestantId);
      setContestant(target || null);
    });
    return () => unsub();
  }, [competitionId, contestantId]);

  useEffect(() => {
    if (!competitionId) return;
    const unsub = subscribeCompetitions((comps) => {
      const comp = comps.find((c) => c.id === competitionId);
      setCompetition(comp || null);
    });
    return () => unsub();
  }, [competitionId]);

  useEffect(() => {
    if (!appUser || !competitionId || !contestantId || !competition) return;
    getScoresByJudgeAndCompetition(appUser.id, competitionId, parsedRound).then((scores) => {
      const existing = scores.find(
        (s) => s.contestantId === contestantId && s.round === parsedRound
      );
      if (existing) {
        setAlreadyScored(true);
        setScoreValues(existing.scores || {});
      }
    });
  }, [appUser, competitionId, contestantId, competition]);

  const handleScoreChange = (criterionId: string, val: number, maxVal: number) => {
    let cleanVal = val;
    if (isNaN(cleanVal) || cleanVal < 0) cleanVal = 0;
    if (cleanVal > maxVal) cleanVal = maxVal;
    setScoreValues((prev) => ({ ...prev, [criterionId]: cleanVal }));
  };

  const currentRoundInfo = competition?.rounds?.[parsedRound];
  const activeCriteria = currentRoundInfo?.criteria?.length
    ? currentRoundInfo.criteria
    : competition?.criteria || [];

  // Sum up score values only for active criteria
  const totalScore = activeCriteria.reduce((sum, c) => sum + (scoreValues[c.id] || 0), 0);
  const maxTotal = activeCriteria.reduce((sum, c) => sum + c.maxScore, 0);

  const handleSubmit = () => {
    // Basic validation
    if (!competition) return;
    for (const crit of activeCriteria) {
      const score = scoreValues[crit.id];
      if (score === undefined || score === null) {
        toast.error(`กรุณากรอกคะแนนหัวข้อ: ${crit.name}`);
        return;
      }
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    if (!appUser || !competitionId || !contestantId || !competition) return;
    setLoading(true);
    try {
      await submitScore({
        judgeId: appUser.id,
        judgeName: appUser.displayName,
        competitionId,
        contestantId,
        round: parsedRound,
        scores: scoreValues,
        totalScore,
      });
      toast.success('ส่งผลคะแนนตัดสินสำเร็จ');
      navigate(`/judge/competition/${competitionId}`);
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกคะแนน');
      console.error(err);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  if (!contestant || !competition) {
    return (
      <div className="card p-5 text-center shadow-sm bg-white border mt-3">
        <span className="spinner-border spinner-border text-primary" role="status" />
        <p className="text-muted text-xs mb-0 mt-3">กำลังโหลดข้อมูลและแบบประเมินคะแนน...</p>
      </div>
    );
  }

  return (
    <div className="card card-primary card-outline shadow-sm mt-3 bg-white">
      {/* Header section with back button */}
      <div className="card-header py-4 px-4 bg-gray-50/50 border-bottom">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <button
            onClick={() => navigate(`/judge/competition/${competitionId}`)}
            className="btn btn-default btn-sm font-weight-bold border-gray-300 shadow-xs py-1.5 px-3.5"
            style={{ cursor: 'pointer' }}
          >
            <i className="fas fa-arrow-left mr-1"></i> ย้อนกลับ
          </button>
          <div className="text-right">
            <h4 className="font-weight-black text-primary mb-1 m-0" style={{ fontSize: '18px' }}>
              {competition.name}
            </h4>
            <span className="font-weight-bold text-danger" style={{ fontSize: '15.5px' }}>
              รอบการประกวด: {currentRoundInfo?.name || 'รอบปัจจุบัน'}
            </span>
          </div>
        </div>

        {/* Contestant summary profile info */}
        <div className="d-flex align-items-center bg-light p-3 border rounded mt-3.5">
          {contestant.imageUrl ? (
            <div className="border rounded shadow-sm flex-shrink-0" style={{ width: '90px', height: '90px', overflow: 'hidden' }}>
              <img src={contestant.imageUrl} alt={contestant.name} className="w-100 h-100" style={{ objectFit: 'cover' }} />
            </div>
          ) : (
            <div className="img-circle bg-blue-50 text-blue-700 border border-blue-100 d-flex align-items-center justify-content-center font-weight-bold flex-shrink-0 shadow-inner" style={{ width: '90px', height: '90px', fontSize: '24px' }}>
              {contestant.number}
            </div>
          )}
          <div className="ml-3 min-w-0 flex-grow-1">
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
      </div>

      <div className="card-body p-4">
        {alreadyScored ? (
          <div className="text-center py-5 text-muted">
            <div className="text-5xl text-danger mb-3">
              <i className="fas fa-exclamation-triangle text-danger"></i>
            </div>
            <h5 className="font-weight-bold text-danger">ส่งผลคะแนนตัดสินแล้ว</h5>
            <p className="text-muted text-xs mb-0">
              ท่านได้ส่งคะแนนผู้เข้าประกวดรายนี้ไปแล้วในระบบและไม่สามารถแก้ไขได้อีกเพื่อความเป็นธรรม
            </p>
            <div className="bg-light border py-3 rounded mt-4 max-w-sm mx-auto shadow-inner">
              <span className="text-xxs font-weight-bold text-muted uppercase tracking-wider block">คะแนนที่ท่านบันทึกไว้</span>
              <span className="text-3xl font-weight-black text-dark">{totalScore} / {maxTotal}</span>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* Scoring sliders */}
            <div className="space-y-4 mb-4">
              {activeCriteria.map((criterion) => (
                <div key={criterion.id} className="card p-3 shadow-xxs bg-white border border-gray-200">
                  <div className="d-flex justify-content-between align-items-center flex-row">
                    {/* Left: Question Name */}
                    <div className="flex-grow-1 pr-3">
                      <span className="font-weight-bold text-dark block mb-0" style={{ fontSize: '15.5px' }}>{criterion.name}</span>
                    </div>

                    {/* Right: Score Input Group */}
                    <div className="flex-shrink-0">
                      <div className="input-group" style={{ width: '140px' }}>
                        <input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min={0}
                          max={criterion.maxScore}
                          placeholder="0"
                          value={scoreValues[criterion.id] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                            handleScoreChange(criterion.id, val, criterion.maxScore);
                          }}
                          className="form-control text-center font-weight-black text-primary"
                          style={{ height: '46px', fontSize: '18px', borderRadius: '6px 0 0 6px' }}
                        />
                        <div className="input-group-append">
                          <span className="input-group-text font-weight-bold text-muted" style={{ fontSize: '13px' }}>
                            / {criterion.maxScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sum section */}
            <div className="card p-4 text-center border-primary shadow-xs mb-4" style={{ background: 'rgba(0,123,255,0.03)' }}>
              <span className="text-xs font-weight-bold text-muted uppercase tracking-wide">คะแนนรวมทั้งหมด</span>
              <div className="font-weight-black text-[#007bff] mt-1" style={{ fontSize: '28px' }}>
                {totalScore} <span className="text-muted text-sm font-bold">/ {maxTotal} คะแนน</span>
              </div>
            </div>

            {/* Save Action */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-primary btn-block py-2.5 font-weight-bold text-sm shadow-sm transition-colors"
            >
              <i className="fas fa-save mr-1"></i> ส่งผลคะแนนตัดสิน
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '380px' }}>
            <div className="modal-content shadow-lg border-0">
              <div className="modal-body text-center p-4 space-y-3">
                <div className="img-circle bg-warning-light text-warning d-flex align-items-center justify-content-center text-2xl mx-auto border" style={{ width: '56px', height: '56px' }}>
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <div>
                  <h5 className="font-weight-bold text-dark mb-1">ยืนยันการส่งผลคะแนนตัดสิน</h5>
                  <p className="text-muted text-xs mb-0 leading-normal">
                    ท่านกำลังยืนยันคะแนนตัดสินให้ <span className="font-weight-bold text-dark">{contestant.name}</span>
                  </p>
                </div>
                <div className="bg-light border py-2.5 rounded">
                  <span className="text-xxs font-weight-bold text-muted uppercase tracking-wider block">คะแนนรวมที่บันทึก</span>
                  <span className="text-2xl font-weight-black text-primary">{totalScore} / {maxTotal}</span>
                </div>
                <div className="alert alert-danger text-left text-xs mb-3 font-weight-bold leading-normal">
                  <i className="fas fa-exclamation-triangle mr-1"></i> เมื่อกดยืนยันแล้ว จะส่งผลคะแนนเข้าสู่ระบบและไม่สามารถแก้ไขได้อีก!
                </div>
                <div className="d-flex gap-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="btn btn-default btn-sm flex-grow-1 font-weight-bold"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    onClick={confirmSubmit}
                    disabled={loading}
                    className="btn btn-success btn-sm flex-grow-1 font-weight-bold shadow-xxs d-flex align-items-center justify-content-center gap-1"
                  >
                    {loading ? 'กำลังส่ง...' : <span><i className="fas fa-check-circle mr-1"></i> ยืนยันคะแนน</span>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoringForm;
