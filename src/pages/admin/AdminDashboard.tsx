import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeCompetitions } from '../../services/competitionService';
import { subscribeJudges } from '../../services/userService';
import type { Competition, AppUser } from '../../types';

const AdminDashboard = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [judges, setJudges] = useState<AppUser[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub1 = subscribeCompetitions(setCompetitions);
    const unsub2 = subscribeJudges(setJudges);
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const stats = [
    {
      label: 'ประเภทการแข่งขัน',
      value: competitions.length,
      icon: 'fas fa-trophy',
      bgClass: 'bg-info',
      path: '/admin/competitions',
    },
    {
      label: 'กำลังดำเนินการอยู่',
      value: competitions.filter((c) => c.status === 'active').length,
      icon: 'fas fa-fire',
      bgClass: 'bg-warning text-dark',
      path: '/admin/rounds',
    },
    {
      label: 'บัญชีกรรมการ',
      value: judges.length,
      icon: 'fas fa-gavel',
      bgClass: 'bg-success',
      path: '/admin/judges',
    },
    {
      label: 'เสร็จสิ้นการประกวด',
      value: competitions.filter((c) => c.status === 'completed').length,
      icon: 'fas fa-check-circle',
      bgClass: 'bg-primary',
      path: '/admin/scoreboard',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Content Header */}
      <div className="content-header p-0 mb-3 border-bottom pb-2">
        <h1 className="m-0 text-dark font-weight-bold" style={{ fontSize: '24px' }}>Dashboard</h1>
        <p className="text-muted text-sm mb-0">ภาพรวมการใช้งานและสถิติของระบบให้คะแนนประกวด S-TECH FRESHMEN AND BRAND AMBRASSADOR</p>
      </div>

      {/* AdminLTE Small Boxes Grid */}
      <div className="row">
        {stats.map((stat) => (
          <div key={stat.label} className="col-lg-3 col-6 mb-3">
            <div className={`small-box ${stat.bgClass} shadow-sm h-100 d-flex flex-col justify-content-between`}>
              <div className="inner p-3">
                <h3 className="font-weight-bold mb-1" style={{ fontSize: '32px' }}>{stat.value}</h3>
                <p className="text-sm font-weight-medium mb-0">{stat.label}</p>
              </div>
              <div className="icon">
                <i className={stat.icon} style={{ fontSize: '50px', top: '15px', right: '15px' }}></i>
              </div>
              <button
                onClick={() => navigate(stat.path)}
                className="small-box-footer btn btn-link w-100 text-center text-xs py-1.5 text-inherit border-0 bg-black-10 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.1)', cursor: 'pointer' }}
              >
                ดูข้อมูลเพิ่มเติม <i className="fas fa-arrow-circle-right ml-1"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Card (AdminLTE Outline Card style) */}
      <div className="card card-primary card-outline shadow-sm mt-3">
        {/* Card Header */}
        <div className="card-header d-flex justify-content-between align-items-center py-2.5">
          <h3 className="card-title font-weight-bold m-0 text-secondary" style={{ fontSize: '15px' }}>
            <i className="fas fa-trophy text-primary mr-1"></i> ประเภทการประกวดทั้งหมด
          </h3>
          <button
            onClick={() => navigate('/admin/competitions')}
            className="btn btn-tool btn-link text-xs font-weight-bold text-primary p-0 border-0 bg-transparent hover:underline"
          >
            จัดการประเภทประกวด
          </button>
        </div>

        {/* Card Body */}
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped table-hover mb-0 text-sm">
              <thead className="thead-light">
                <tr>
                  <th className="pl-4">ประเภท</th>
                  <th>เกณฑ์การให้คะแนน</th>
                  <th>รอบประกวด</th>
                  <th className="text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {competitions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-5 text-muted">
                      <div className="text-4xl mb-2 text-gray-300"><i className="fas fa-trophy"></i></div>
                      <p className="font-weight-bold mb-0 text-sm">ยังไม่ได้เพิ่มประเภทการแข่งขัน</p>
                      <p className="text-xs text-muted mb-0">ไปที่หน้าประเภทการประกวดเพื่อเพิ่มข้อมูลดาว/เดือน/LG</p>
                    </td>
                  </tr>
                ) : (
                  competitions.map((comp) => (
                    <tr key={comp.id}>
                      <td className="pl-4 font-weight-bold">
                        <span className="badge badge-secondary mr-2">{comp.name.charAt(0)}</span>
                        {comp.name}
                      </td>
                      <td>{comp.criteria?.length || 0} เกณฑ์คะแนน</td>
                      <td>{comp.rounds?.length || 0} รอบประกวด</td>
                      <td className="text-center">
                        <span
                          className={`badge ${
                            comp.status === 'active'
                              ? 'badge-success'
                              : comp.status === 'completed'
                              ? 'badge-primary'
                              : 'badge-secondary'
                          } px-2 py-1`}
                        >
                          {comp.status === 'active' ? 'กำลังดำเนินการ' : comp.status === 'completed' ? 'เสร็จสิ้น' : 'แบบร่าง'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
