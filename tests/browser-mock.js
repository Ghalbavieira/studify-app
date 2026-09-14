// Browser-only fixture. Never loaded by application code. No real account or service writes.
(() => {
  const uid = "10000000-0000-4000-8000-000000000001";
  const subject = "20000000-0000-4000-8000-000000000001";
  const topic = "30000000-0000-4000-8000-000000000001";
  const goal = "40000000-0000-4000-8000-000000000001";
  const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  const today = date.toISOString().slice(0,10);
  const initial = { version:1, profileName:"Pessoa de teste", goal:{id:goal,title:"Concurso de teste",examDate:"2026-12-20",weeklyMinutes:600}, subjects:[{id:subject,name:"Redes",weight:2,color:"blue"}], topics:[{id:topic,subjectId:subject,title:"VLAN",completed:false}], blocks:[{id:"50000000-0000-4000-8000-000000000001",date:today,subjectId:subject,topicId:topic,minutes:45,description:"Bloco de teste",done:false,plannedQuestions:20,sessionType:"study"}], sessions:[],tasks:[],attempts:[] };
  const read = (key, fallback) => JSON.parse(sessionStorage.getItem(key) || JSON.stringify(fallback));
  const write = (key, value) => sessionStorage.setItem(key, JSON.stringify(value));
  const user = {id:uid,aud:"authenticated",role:"authenticated",email:"fixture@example.test",created_at:new Date().toISOString(),app_metadata:{provider:"email"},user_metadata:{display_name:"Pessoa de teste"}};
  const token = [btoa(JSON.stringify({alg:"HS256",typ:"JWT"})),btoa(JSON.stringify({sub:uid,role:"authenticated",exp:Math.floor(Date.now()/1000)+86400})),"fixture"].join(".");
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input.url || String(input), location.origin);
    if (!url.hostname.includes("supabase")) return original(input,init);
    const body = init?.body ? JSON.parse(init.body) : {};
    const ok = (data,status=200) => Promise.resolve(new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json"}}));
    const path = url.pathname;
    if (path.includes("/auth/v1/token")) return ok({access_token:token,refresh_token:"fixture-refresh",expires_in:86400,token_type:"bearer",user});
    if (path.includes("/auth/v1/user")) return ok(user);
    if (path.includes("/auth/v1/logout")) return ok({});
    if (path.includes("/auth/v1/signup")) return ok({user,session:null});
    if (path.includes("/auth/v1/recover")) return ok({});
    if (path.endsWith("/get_study_data")) return ok(read("fixture.study",{revision:0,data:initial}));
    if (path.endsWith("/save_study_data")) { const stored=read("fixture.study",{revision:0,data:initial});if(stored.revision!==body.p_expected_revision)return ok({message:"conflict",code:"40001"},409);const next={revision:stored.revision+1,data:body.p_data};write("fixture.study",next);return ok(next); }
    if (path.endsWith("/get_entitlement")) { const pro=sessionStorage.getItem("fixture.plan")!=="free";return ok({version:1,plan:pro?"pro":"free",status:pro?"trialing":"free",billingStatus:pro?"trialing":"active",trialDaysRemaining:pro?15:0,capabilities:Object.fromEntries(["canCreateMultipleGoals","canUseFullHistory","canUseAdvancedAnalytics","canUseAdvancedAI","canUseAdvancedExamImport","canUseAdvancedPlanning","canUseFullReports"].map(k=>[k,pro])),limits:{goals:pro?10:1,historyDays:pro?null:30,examImportsPerMonth:pro?10:1,aiRequestsPerDay:pro?50:3}}); }
    if (path.endsWith("/questions")) return ok([{id:"60000000-0000-4000-8000-000000000001",subject_id:null,topic_id:null,subject_label:"Redes",topic_label:"VLAN",statement:"Questão de teste: qual alternativa descreve uma VLAN?",difficulty:"easy",source_type:"own",source_reference:"Fixture",exam:{organization:"Órgão de teste",role:"Cargo de teste",year:2026,exam_board:{name:"Banca de teste"}},options:[{id:"70000000-0000-4000-8000-000000000001",label:"A",text:"Rede local virtual"},{id:"70000000-0000-4000-8000-000000000002",label:"B",text:"Disco físico"}]}]);
    if (path.endsWith("/answer_question")) { const stored=read("fixture.study",{revision:0,data:initial});const attempt={id:body.p_request_id,questionId:body.p_question_id,studySessionId:body.p_study_session_id,subjectId:body.p_subject_id,topicId:body.p_topic_id,selectedOptionId:body.p_selected_option_id,isCorrect:body.p_selected_option_id.endsWith("1"),responseTimeSeconds:body.p_response_time_seconds,answeredAt:new Date().toISOString()};if(!stored.data.attempts.some(a=>a.id===attempt.id)){stored.data.attempts.push(attempt);stored.revision++;write("fixture.study",stored);}return ok({attempt:{id:attempt.id,question_id:attempt.questionId,study_session_id:attempt.studySessionId,subject_id:attempt.subjectId,topic_id:attempt.topicId,selected_option_id:attempt.selectedOptionId,is_correct:attempt.isCorrect,response_time_seconds:attempt.responseTimeSeconds,answered_at:attempt.answeredAt},correct_option_id:"70000000-0000-4000-8000-000000000001",explanation:"VLAN significa rede local virtual."}); }
    if (path.endsWith("/community_policy")) return ok({version:"2026-09-12",enabled:false,support_email:""});
    if (path.endsWith("/community_my_status")) return ok({suspended:false,reviews:[]});
    if (path.includes("/rest/v1/")) return ok([]);
    throw new Error(`Unmocked service path: ${path}`);
  };
})();
