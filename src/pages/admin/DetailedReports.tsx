import { useEffect, useState } from 'react';
import { subscribeCompetitions } from '../../services/competitionService';
import { subscribeContestantsByCompetition } from '../../services/contestantService';
import { subscribeScoresByCompetition } from '../../services/scoreService';
import { getJudgesByCompetition } from '../../services/userService';
import type { Competition, Contestant, Score, AppUser } from '../../types';
import toast from 'react-hot-toast';

const DetailedReports = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [judges, setJudges] = useState<AppUser[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>('all');
  const [viewType, setViewType] = useState<'summary' | 'criteria_total' | 'detailed_grid'>('summary');

  const selectedComp = competitions.find((c) => c.id === selectedCompId);

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
    const unsub = subscribeScoresByCompetition(selectedCompId, setScores);
    return () => unsub();
  }, [selectedCompId]);

  useEffect(() => {
    if (!selectedCompId) return;
    getJudgesByCompetition(selectedCompId).then(setJudges);
  }, [selectedCompId]);

  // Reset filters when competition changes
  useEffect(() => {
    setSelectedRound('all');
    setSelectedJudgeId('all');
  }, [selectedCompId]);

  // Compile report data based on filters
  const getReportData = () => {
    if (!selectedComp) return [];

    const currentCompRound = selectedComp.currentRound ?? 0;
    const rounds = selectedComp.rounds || [];
    const roundList = selectedRound === 'all' 
      ? rounds.map((_, idx) => idx) 
      : [parseInt(selectedRound, 10)];

    const reportRounds = roundList.map((rIdx) => {
      const roundInfo = rounds[rIdx];
      
      // Get contestants active in this round (not eliminated before this round)
      const activeContestants = contestants.filter(
        (c) => c.eliminatedAtRound === null || c.eliminatedAtRound === undefined || c.eliminatedAtRound >= rIdx
      );

      const roundScores = scores.filter((s) => s.round === rIdx);

      // Build data for each contestant in this round
      const entries = activeContestants.map((contestant) => {
        const contestantScores = roundScores.filter((s) => s.contestantId === contestant.id);
        
        let filteredScores = contestantScores;
        if (selectedJudgeId !== 'all') {
          filteredScores = contestantScores.filter((s) => s.judgeId === selectedJudgeId);
        }

        const totalScore = filteredScores.reduce((sum, s) => sum + s.totalScore, 0);
        const averageScore = filteredScores.length > 0 ? totalScore / filteredScores.length : 0;
        
        // Find individual judge scores for reference
        const judgeScoreMap: Record<string, number> = {};
        contestantScores.forEach((s) => {
          judgeScoreMap[s.judgeId] = s.totalScore;
        });

        // Detail criteria scores if specific judge is selected
        const myScore = contestantScores.find((s) => s.judgeId === selectedJudgeId);

        return {
          contestant,
          totalScore,
          averageScore,
          judgeScoreMap,
          myScore,
          contestantScores,
          isAdvanced: false,
          rank: 0,
        };
      });

      // Sort entries by total score descending
      entries.sort((a, b) => b.totalScore - a.totalScore);
      
      const topN = roundInfo.topN ?? entries.length;

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

      return {
        roundIndex: rIdx,
        roundInfo,
        entries,
      };
    });

    return reportRounds;
  };

  const reportData = getReportData();

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!selectedComp || reportData.length === 0) {
      toast.error('ไม่มีข้อมูลที่จะส่งออก');
      return;
    }

    try {
      let csvContent = '\uFEFF'; // UTF-8 BOM
      
      reportData.forEach((rData) => {
        csvContent += `"${selectedComp.name} - ${rData.roundInfo.name || `รอบที่ ${rData.roundIndex + 1}`}"\n`;

        const targetRound = selectedComp.rounds?.[rData.roundIndex];
        const activeCriteria = targetRound?.criteria?.length
          ? targetRound.criteria
          : selectedComp.criteria || [];

        if (selectedJudgeId === 'all' && viewType === 'detailed_grid') {
          // Detailed grid CSV output contestant-by-contestant
          rData.entries.forEach((entry) => {
            let statusText = '-';
            if (rData.roundInfo.status !== 'pending') {
              if ((entry as any).isTied) {
                statusText = 'คะแนนเท่ากัน (รอตัดสิน)';
              } else {
                statusText = entry.isAdvanced ? 'ผ่านเข้ารอบ' : 'ไม่ผ่าน';
              }
            }

            csvContent += `"#${entry.rank} - No. ${entry.contestant.number} - ${entry.contestant.name} - Status: ${statusText}"\n`;
            
            // Header for sub-table
            let subHeaders = ['เกณฑ์การให้คะแนน'];
            judges.forEach(j => subHeaders.push(j.displayName));
            subHeaders.push('คะแนนรวม');
            csvContent += subHeaders.map(h => `"${h}"`).join(',') + '\n';

            // Rows for criteria
            activeCriteria.forEach((crit) => {
              let row = [crit.name];
              const criterionScores = judges.map(j => {
                const scoreObj = entry.contestantScores.find(s => s.judgeId === j.id);
                return scoreObj?.scores?.[crit.id];
              });
              
              judges.forEach((j, idx) => {
                const val = criterionScores[idx];
                row.push(val !== undefined ? val.toString() : '-');
              });

              const total = criterionScores.reduce((sum, val) => sum + (val || 0), 0);
              row.push(total.toString());
              csvContent += row.map(v => `"${v}"`).join(',') + '\n';
            });

            // Grand Total Row
            let totalRow = ['คะแนนรวมทั้งหมด'];
            judges.forEach(j => {
              const scoreObj = entry.contestantScores.find(s => s.judgeId === j.id);
              totalRow.push(scoreObj !== undefined ? scoreObj.totalScore.toString() : '-');
            });
            totalRow.push(entry.totalScore.toString());
            csvContent += totalRow.map(v => `"${v}"`).join(',') + '\n\n';
          });
        } else {
          // Standard CSV output
          let headers = ['อันดับ', 'หมายเลข', 'ชื่อผู้เข้าสมัคร'];
          
          if (selectedJudgeId === 'all') {
            if (viewType === 'summary') {
              judges.forEach((j) => headers.push(j.displayName));
              headers.push('คะแนนรวม');
            } else {
              activeCriteria.forEach((crit) => headers.push(`${crit.name} (รวม)`));
              headers.push('คะแนนรวมทั้งหมด');
            }
          } else {
            activeCriteria.forEach((crit) => headers.push(`${crit.name} (เต็ม ${crit.maxScore})`));
            headers.push('คะแนนรวม');
          }
          headers.push('สถานะ');
          csvContent += headers.map(h => `"${h}"`).join(',') + '\n';

          // Rows
          rData.entries.forEach((entry) => {
            let row = [
              rData.roundInfo.status === 'pending' ? '-' : entry.rank.toString(),
              entry.contestant.number.toString(),
              entry.contestant.name
            ];

            if (selectedJudgeId === 'all') {
              if (viewType === 'summary') {
                judges.forEach((j) => {
                  const val = entry.judgeScoreMap[j.id];
                  row.push(val !== undefined ? val.toString() : '-');
                });
                row.push(rData.roundInfo.status === 'pending' ? '-' : entry.totalScore.toString());
              } else {
                activeCriteria.forEach((crit) => {
                  const criterionScores = entry.contestantScores.map(s => s.scores[crit.id]);
                  const validScores = criterionScores.filter(v => v !== undefined);
                  const sum = validScores.length > 0 ? validScores.reduce((sum, v) => sum + v, 0) : 0;
                  row.push(validScores.length > 0 ? sum.toString() : '-');
                });
                row.push(rData.roundInfo.status === 'pending' ? '-' : entry.totalScore.toString());
              }
            } else {
              activeCriteria.forEach((crit) => {
                const val = entry.myScore?.scores?.[crit.id];
                row.push(val !== undefined ? val.toString() : '-');
              });
              row.push(rData.roundInfo.status === 'pending' ? '-' : entry.totalScore.toString());
            }

            let statusText = '-';
            if (rData.roundInfo.status !== 'pending') {
              if ((entry as any).isTied) {
                statusText = 'คะแนนเท่ากัน (รอตัดสิน)';
              } else {
                statusText = entry.isAdvanced ? 'ผ่านเข้ารอบ' : 'ไม่ผ่าน';
              }
            }
            row.push(statusText);
            csvContent += row.map(v => `"${v}"`).join(',') + '\n';
          });
          csvContent += '\n\n';
        }
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `รายงานคะแนน_${selectedComp.name}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('ส่งออกรายงาน CSV สำเร็จ');
    } catch (err) {
      console.error(err);
      toast.error('ไม่สามารถส่งออก CSV ได้');
    }
  };

  return (
    <div className="space-y-4">
      {/* Styles for print view */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .main-sidebar, .main-header, .content-header, .filters-section, .btn-print, .btn-export, footer {
            display: none !important;
          }
          .content-wrapper {
            margin-left: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
          }
          .table-responsive {
            overflow: visible !important;
          }
          .table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .table th, .table td {
            border: 1px solid #000 !important;
            color: #000 !important;
            padding: 6px !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="content-header p-0 mb-3 border-bottom pb-2 d-flex justify-content-between align-items-center flex-wrap btn-print">
        <div>
          <h1 className="m-0 text-dark font-weight-bold" style={{ fontSize: '24px' }}>
            <i className="fas fa-file-invoice text-primary mr-2"></i> รายงานคะแนนแบบละเอียด
          </h1>
          <p className="text-muted text-sm mb-0">ออกรายงานผลคะแนน คัดกรองตามรายรอบ หรือกรรมการผู้ให้คะแนน พร้อมส่งออกข้อมูล</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            onClick={handlePrint}
            className="btn btn-default btn-sm font-weight-bold border-gray-300 shadow-xs"
            disabled={!selectedCompId}
          >
            <i className="fas fa-print mr-1"></i> พิมพ์รายงาน
          </button>
          <button
            onClick={handleExportCSV}
            className="btn btn-success btn-sm font-weight-bold shadow-sm"
            disabled={!selectedCompId}
          >
            <i className="fas fa-file-excel mr-1"></i> ส่งออกเป็น CSV
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="card shadow-sm p-4 bg-white border mb-3 filters-section">
        <div className="row">
          {/* Competition Selector */}
          <div className={`${selectedJudgeId === 'all' ? 'col-md-3' : 'col-md-4'} col-12 mb-3`}>
            <label className="text-xs font-weight-bold text-muted text-uppercase mb-1.5 d-block">ประเภทการแข่งขัน</label>
            <select
              value={selectedCompId}
              onChange={(e) => setSelectedCompId(e.target.value)}
              className="form-control font-weight-bold"
            >
              {competitions.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Round Selector */}
          <div className={`${selectedJudgeId === 'all' ? 'col-md-3' : 'col-md-4'} col-12 mb-3`}>
            <label className="text-xs font-weight-bold text-muted text-uppercase mb-1.5 d-block">รอบการประกวด</label>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="form-control"
              disabled={!selectedCompId}
            >
              <option value="all">แสดงผลทุกรอบ</option>
              {selectedComp?.rounds?.map((r, idx) => (
                <option key={idx} value={idx}>
                  {r.name || `รอบที่ ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Judge Selector */}
          <div className={`${selectedJudgeId === 'all' ? 'col-md-3' : 'col-md-4'} col-12 mb-3`}>
            <label className="text-xs font-weight-bold text-muted text-uppercase mb-1.5 d-block">กรรมการผู้ลงคะแนน</label>
            <select
              value={selectedJudgeId}
              onChange={(e) => setSelectedJudgeId(e.target.value)}
              className="form-control"
              disabled={!selectedCompId}
            >
              <option value="all">กรรมการทุกคน (แสดงคะแนนรวม/เฉลี่ย)</option>
              {judges.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.displayName} (เฉพาะรายบุคคล)
                </option>
              ))}
            </select>
          </div>

          {/* View Type Selector */}
          {selectedJudgeId === 'all' && (
            <div className="col-md-3 col-12 mb-3">
              <label className="text-xs font-weight-bold text-muted text-uppercase mb-1.5 d-block">รูปแบบตารางรายงาน</label>
              <select
                value={viewType}
                onChange={(e) => setViewType(e.target.value as any)}
                className="form-control"
              >
                <option value="summary">ตารางสรุปคะแนนรวมกรรมการ</option>
                <option value="criteria_total">ตารางสรุปคะแนนรวมแยกตามหัวข้อเกณฑ์</option>
                <option value="detailed_grid">คะแนนดิบรายหัวข้อแยกกรรมการย่อย</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Print-Only Title */}
      <div className="d-none d-print-block text-center mb-4">
        <h2 className="font-weight-bold mb-1">รายงานผลการให้คะแนน</h2>
        <h4 className="text-secondary mb-1">ประเภทประกวด: {selectedComp?.name}</h4>
        <small className="text-muted">พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</small>
      </div>

      {/* Report Cards Content */}
      <div className="space-y-4">
        {reportData.map((rData) => {
          const activeCriteria = rData.roundInfo?.criteria?.length
            ? rData.roundInfo.criteria
            : selectedComp?.criteria || [];

          return (
            <div key={rData.roundIndex} className="card card-primary card-outline shadow-sm overflow-hidden bg-white border mb-4">
              <div className="card-header bg-gray-50/50 py-2.5 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h3 className="card-title font-weight-bold text-secondary m-0" style={{ fontSize: '15px' }}>
                  <i className="fas fa-trophy text-primary mr-1.5"></i> {rData.roundInfo.name || `รอบที่ ${rData.roundIndex + 1}`}
                  <span className={`badge ml-2 px-2 py-0.5 text-xs ${
                    rData.roundInfo.status === 'completed'
                      ? 'badge-primary'
                      : rData.roundInfo.status === 'active'
                      ? 'badge-success'
                      : 'badge-secondary'
                  }`} style={{ fontSize: '10px' }}>
                    {rData.roundInfo.status === 'completed' 
                      ? 'ตัดสินเสร็จสิ้น' 
                      : rData.roundInfo.status === 'active'
                      ? 'กำลังให้คะแนน'
                      : 'ยังไม่เริ่มให้คะแนน'}
                  </span>
                </h3>
                <span className="text-muted text-xs font-weight-bold">
                  ผู้ประกวดในรอบนี้: {rData.entries.length} คน
                </span>
              </div>

              <div className="card-body p-0">
                {selectedJudgeId === 'all' && viewType === 'detailed_grid' ? (
                  <div className="p-4 space-y-4">
                    {rData.entries.map((entry) => {
                      return (
                        <div key={entry.contestant.id} className="card card-outline card-secondary border shadow-xs p-3 bg-white mb-4">
                          <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom flex-wrap gap-2">
                            <div>
                              <span className="font-weight-black text-dark" style={{ fontSize: '15px' }}>
                                อันดับที่ {rData.roundInfo.status === 'pending' ? '—' : entry.rank} &nbsp;|&nbsp; 
                                หมายเลข {entry.contestant.number} &nbsp;|&nbsp; 
                                {entry.contestant.name}
                              </span>
                              {entry.contestant.nickname && <span className="text-muted text-xs ml-2">ชื่อเล่น: "{entry.contestant.nickname}"</span>}
                              {entry.contestant.classroom && <span className="badge badge-light border text-secondary ml-2 py-0.5 px-1.5" style={{ fontSize: '9px' }}>ห้อง: {entry.contestant.classroom}</span>}
                            </div>
                            <div>
                              {rData.roundInfo.status === 'pending' ? (
                                <span className="text-muted font-light">ยังไม่เริ่ม</span>
                              ) : (entry as any).isTied ? (
                                <span className="badge badge-warning px-2 py-1" style={{ fontSize: '10.5px', backgroundColor: '#fff3cd', borderColor: '#ffeeba', color: '#856404' }}><i className="fas fa-exclamation-triangle mr-1"></i> คะแนนเท่ากัน (รอตัดสิน)</span>
                              ) : entry.isAdvanced ? (
                                <span className="badge badge-success px-2 py-1" style={{ fontSize: '10.5px' }}><i className="fas fa-check mr-1"></i> ผ่านเข้ารอบ</span>
                              ) : (
                                <span className="badge badge-danger px-2 py-1" style={{ fontSize: '10.5px' }}><i className="fas fa-times mr-1"></i> ไม่ผ่าน</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="table-responsive">
                            <table className="table table-bordered table-striped table-hover mb-0 text-sm">
                              <thead className="thead-light">
                                <tr className="bg-light">
                                  <th>เกณฑ์การตัดสิน</th>
                                  {judges.map(j => (
                                    <th key={j.id} className="text-center">{j.displayName}</th>
                                  ))}
                                  <th className="text-center bg-blue-50/20" style={{ width: '120px' }}>คะแนนรวม</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeCriteria.map((crit) => {
                                  const criterionScores = judges.map(j => {
                                    const scoreObj = entry.contestantScores.find(s => s.judgeId === j.id);
                                    return scoreObj?.scores?.[crit.id];
                                  });
                                  
                                  const total = criterionScores.reduce((sum, val) => sum + (val || 0), 0);
                                  
                                  return (
                                    <tr key={crit.id}>
                                      <td className="font-weight-bold text-dark">{crit.name} <small className="text-muted font-normal">(เต็ม {crit.maxScore})</small></td>
                                      {judges.map((j, idx) => {
                                        const val = criterionScores[idx];
                                        return (
                                          <td key={j.id} className="text-center align-middle font-weight-bold text-secondary">
                                            {val !== undefined ? val : <span className="text-muted font-light">—</span>}
                                          </td>
                                        );
                                      })}
                                      <td className="text-center align-middle font-weight-bold text-primary bg-blue-50/10">{total}</td>
                                    </tr>
                                  );
                                })}
                                {/* Grand Total Row */}
                                <tr className="bg-light font-weight-bold">
                                  <td className="align-middle text-dark font-weight-extrabold">คะแนนรวมทั้งหมด</td>
                                  {judges.map(j => {
                                    const scoreObj = entry.contestantScores.find(s => s.judgeId === j.id);
                                    return (
                                      <td key={j.id} className="text-center align-middle text-secondary font-weight-extrabold">
                                        {scoreObj !== undefined ? scoreObj.totalScore : <span className="text-muted font-light">—</span>}
                                      </td>
                                    );
                                  })}
                                  <td className="text-center align-middle text-primary font-weight-black bg-blue-50/20" style={{ fontSize: '15px' }}>
                                    {rData.roundInfo.status === 'pending' ? '—' : entry.totalScore}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped table-hover mb-0 text-sm">
                      <thead className="thead-light">
                        <tr className="bg-light">
                          <th className="text-center" style={{ width: '60px' }}>อันดับ</th>
                          <th className="text-center" style={{ width: '80px' }}>หมายเลข</th>
                          <th>ผู้สมัครเข้าแข่งขัน</th>
                          
                          {/* Headers dynamic based on selected judge and view type */}
                          {selectedJudgeId === 'all' ? (
                            viewType === 'summary' ? (
                              <>
                                {judges.map((j) => (
                                  <th key={j.id} className="text-center">{j.displayName}</th>
                                ))}
                                <th className="text-center bg-blue-50/20" style={{ width: '120px' }}>คะแนนรวม</th>
                              </>
                            ) : (
                              <>
                                {activeCriteria.map((crit) => (
                                  <th key={crit.id} className="text-center">
                                    {crit.name}
                                    <span className="text-muted d-block text-xxs font-normal">(รวม)</span>
                                  </th>
                                ))}
                                <th className="text-center bg-blue-50/20" style={{ width: '140px' }}>คะแนนรวมทั้งหมด</th>
                              </>
                            )
                          ) : (
                            <>
                              {activeCriteria.map((crit) => (
                                <th key={crit.id} className="text-center">
                                  {crit.name}
                                  <span className="text-muted d-block text-xxs font-normal">(เต็ม {crit.maxScore})</span>
                                </th>
                              ))}
                              <th className="text-center bg-blue-50/20" style={{ width: '120px' }}>คะแนนรวม</th>
                            </>
                          )}
                          
                          <th className="text-center" style={{ width: '120px' }}>สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rData.entries.map((entry) => (
                          <tr key={entry.contestant.id}>
                            {/* Rank */}
                            <td className="text-center align-middle font-weight-extrabold text-dark" style={{ fontSize: '14.5px' }}>
                              {rData.roundInfo.status === 'pending' ? '—' : entry.rank}
                            </td>

                            {/* Contestant Number */}
                            <td className="text-center align-middle font-weight-bold" style={{ fontSize: '14.5px' }}>
                              No. {entry.contestant.number}
                            </td>

                            {/* Contestant Name */}
                            <td className="align-middle">
                              <span className="font-weight-bold text-dark">{entry.contestant.name}</span>
                              {entry.contestant.nickname && (
                                <span className="text-muted font-normal text-xs ml-1.5">ชื่อเล่น: "{entry.contestant.nickname}"</span>
                              )}
                              {entry.contestant.classroom && (
                                <small className="badge badge-light border text-secondary ml-2 py-0.5 px-1.5" style={{ fontSize: '9px' }}>
                                  ห้อง: {entry.contestant.classroom}
                                </small>
                              )}
                            </td>

                            {/* Score Cells dynamic based on selected judge and view type */}
                            {selectedJudgeId === 'all' ? (
                              viewType === 'summary' ? (
                                <>
                                  {judges.map((j) => {
                                    const val = entry.judgeScoreMap[j.id];
                                    return (
                                      <td key={j.id} className="text-center align-middle font-weight-bold text-secondary">
                                        {val !== undefined ? val : <span className="text-muted font-light">—</span>}
                                      </td>
                                    );
                                  })}
                                  <td className="text-center align-middle bg-blue-50/20 font-weight-black text-primary" style={{ fontSize: '16px' }}>
                                    {rData.roundInfo.status === 'pending' ? '—' : entry.totalScore}
                                  </td>
                                </>
                              ) : (
                                <>
                                  {activeCriteria.map((crit) => {
                                    const criterionScores = entry.contestantScores.map(s => s.scores[crit.id]);
                                    const validScores = criterionScores.filter(v => v !== undefined);
                                    const sum = validScores.length > 0 ? validScores.reduce((sum, v) => sum + v, 0) : 0;
                                    return (
                                      <td key={crit.id} className="text-center align-middle font-weight-bold text-secondary">
                                        {validScores.length > 0 ? sum : <span className="text-muted font-light">—</span>}
                                      </td>
                                    );
                                  })}
                                  <td className="text-center align-middle bg-blue-50/20 font-weight-black text-primary" style={{ fontSize: '16px' }}>
                                    {rData.roundInfo.status === 'pending' ? '—' : entry.totalScore}
                                  </td>
                                </>
                              )
                            ) : (
                              <>
                                {activeCriteria.map((crit) => {
                                  const val = entry.myScore?.scores?.[crit.id];
                                  return (
                                    <td key={crit.id} className="text-center align-middle font-weight-bold text-secondary">
                                      {val !== undefined ? val : <span className="text-muted font-light">—</span>}
                                    </td>
                                  );
                                })}
                                <td className="text-center align-middle bg-blue-50/20 font-weight-black text-primary" style={{ fontSize: '16px' }}>
                                  {rData.roundInfo.status === 'pending' ? '—' : entry.totalScore}
                                </td>
                              </>
                            )}

                            {/* Status */}
                            <td className="text-center align-middle">
                              {rData.roundInfo.status === 'pending' ? (
                                <span className="text-muted font-light">ยังไม่เริ่ม</span>
                              ) : (entry as any).isTied ? (
                                <span className="badge badge-warning px-2 py-1" style={{ fontSize: '10.5px', backgroundColor: '#fff3cd', borderColor: '#ffeeba', color: '#856404' }}><i className="fas fa-exclamation-triangle mr-1"></i> คะแนนเท่ากัน (รอตัดสิน)</span>
                              ) : entry.isAdvanced ? (
                                <span className="badge badge-success px-2 py-1" style={{ fontSize: '10.5px' }}><i className="fas fa-check mr-1"></i> ผ่านเข้ารอบ</span>
                              ) : (
                                <span className="badge badge-danger px-2 py-1" style={{ fontSize: '10.5px' }}><i className="fas fa-times mr-1"></i> ไม่ผ่าน</span>
                              )}
                            </td>
                          </tr>
                        ))}

                        {rData.entries.length === 0 && (
                          <tr>
                            <td colSpan={20} className="text-center py-4 text-muted bg-white">
                              ไม่มีผู้สมัครประกวดที่เข้าแข่งขันในรอบนี้
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {reportData.length === 0 && (
          <div className="card p-5 text-center shadow-xs bg-white border">
            <div className="text-muted text-5xl mb-3"><i className="fas fa-file-invoice"></i></div>
            <h5 className="font-weight-bold text-dark mb-1">ไม่พบข้อมูลรายงานคะแนน</h5>
            <p className="text-muted text-xs mb-0">กรุณาตรวจสอบว่ามีประเภทการประกวดและการให้คะแนนเกิดขึ้นในระบบหรือไม่</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailedReports;
