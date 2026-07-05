import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeCompetitions } from '../../services/competitionService';
import type { Competition } from '../../types';

const SelectCompetition = () => {
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  useEffect(() => {
    const unsub = subscribeCompetitions((comps) => {
      // Filter only assigned competitions for this judge
      const assigned = comps.filter((c) => appUser?.competitionIds?.includes(c.id));
      setCompetitions(assigned);
    });
    return () => unsub();
  }, [appUser]);

  return (
    <div className="card card-primary card-outline shadow-sm mt-3 bg-white">
      <div className="card-header text-center py-4 bg-gray-50/50 border-bottom">
        <h3 className="card-title w-100 font-weight-bold text-dark m-0 d-flex align-items-center justify-content-center" style={{ fontSize: '20px', gap: '8px' }}>
          <img
            src="/LOGO_SERIRACHA_COLOR_TRANERENT (1).png"
            alt="College Logo"
            className="brand-image img-circle"
            style={{ width: '32px', height: '32px', objectFit: 'contain', backgroundColor: 'white', padding: '1px' }}
          />
          โปรดเลือกประเภทการประกวด
        </h3>
        <p className="text-muted text-xs mb-0 mt-2">
          เลือกประเภทประกวดที่ท่านรับผิดชอบด้านล่างเพื่อเริ่มการประเมินและลงคะแนนให้คะแนน
        </p>
      </div>

      <div className="card-body p-4">
        {competitions.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <div className="text-5xl text-gray-300 mb-3">
              <i className="fas fa-exclamation-circle"></i>
            </div>
            <h5 className="font-weight-bold text-dark mb-1">ไม่พบประเภทการประกวดที่ได้รับมอบหมาย</h5>
            <p className="text-muted text-xs mb-0">กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อทำการกำหนดสิทธิ์ลงคะแนน</p>
          </div>
        ) : (
          <div className="row">
            {competitions.map((comp) => {
              const currentRoundInfo = comp.rounds?.[comp.currentRound];
              return (
                <div key={comp.id} className="col-12 mb-4">
                  <button
                    onClick={() => navigate(`/judge/competition/${comp.id}`)}
                    className="btn btn-block btn-outline-primary text-left p-4 h-100 d-flex flex-column justify-content-between shadow-xs hover:shadow transition-all bg-white border-gray-200"
                    style={{ borderRadius: '6px', color: 'inherit' }}
                  >
                    <div className="d-flex align-items-center w-100 mb-3">
                      <div className="w-100">
                        <h5 className="font-weight-bold text-dark mb-1 text-truncate" style={{ fontSize: '18px' }}>
                          {comp.name}
                        </h5>
                        {comp.description && (
                          <div
                            className="text-muted text-xs mb-0 mt-1 rich-text-content"
                            dangerouslySetInnerHTML={{ __html: comp.description }}
                          />
                        )}
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 pt-3 border-top w-100">
                      {(comp.status === 'active' || comp.status === 'completed') && (
                        <span
                          className={`badge ${
                            comp.status === 'active'
                              ? 'badge-success'
                              : 'badge-primary'
                          } px-2.5 py-1.5`}
                          style={{ fontSize: '10px' }}
                        >
                          {comp.status === 'active' ? 'เปิดให้คะแนนตัดสิน' : 'เสร็จสิ้นการประกวด'}
                        </span>
                      )}
                      {currentRoundInfo && (
                        <span className="badge badge-light border text-secondary px-2.5 py-1.5 font-weight-bold" style={{ fontSize: '10px' }}>
                          {currentRoundInfo.name}
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
    </div>
  );
};

export default SelectCompetition;
