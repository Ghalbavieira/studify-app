begin;

insert into public.exam_boards (id,name,slug) values ('30000000-0000-4000-8000-000000000001','Studify — material autoral','studify-autoral');

insert into public.exams (id,exam_board_id,organization,role,year) values ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Studify','Demonstração própria — não é prova oficial',2026);

insert into public.questions (id,exam_id,subject_label,topic_label,statement,explanation,difficulty,source_type,source_reference,visibility) values ('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Redes','Endereçamento IPv4','Uma rede IPv4 /24 reserva um endereço para a rede e outro para broadcast. Quantos endereços restam para hosts?','Um /24 deixa 8 bits para hosts: 2⁸ = 256 endereços. Retirando rede e broadcast, restam 254.','easy','own','Demonstração própria do Studify; não corresponde a uma prova oficial.','public');

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','A','128',false);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','B','254',true);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','C','256',false);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001','D','512',false);

insert into public.questions (id,exam_id,subject_label,topic_label,statement,explanation,difficulty,source_type,source_reference,visibility) values ('10000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','RLM','Porcentagem','Uma estudante resolveu 80 questões e errou 20% delas. Quantas questões ela errou?','20% de 80 é 0,20 × 80 = 16.','easy','own','Demonstração própria do Studify; não corresponde a uma prova oficial.','public');

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000002','A','8',false);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000002','B','12',false);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000022','10000000-0000-4000-8000-000000000002','C','16',true);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000023','10000000-0000-4000-8000-000000000002','D','20',false);

insert into public.questions (id,exam_id,subject_label,topic_label,statement,explanation,difficulty,source_type,source_reference,visibility) values ('10000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001','Português','Concordância verbal','Complete a frase com a concordância adequada: “As estudantes ___ os tópicos antes da prova.”','O sujeito “As estudantes” está no plural. A forma verbal que concorda com ele é “revisam”.','easy','own','Demonstração própria do Studify; não corresponde a uma prova oficial.','public');

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000030','10000000-0000-4000-8000-000000000003','A','revisa',false);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000031','10000000-0000-4000-8000-000000000003','B','revisam',true);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000032','10000000-0000-4000-8000-000000000003','C','revisou',false);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000033','10000000-0000-4000-8000-000000000003','D','revisando',false);

insert into public.questions (id,exam_id,subject_label,topic_label,statement,explanation,difficulty,source_type,source_reference,visibility) values ('10000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000001','Segurança','Autenticação','Qual alternativa combina dois fatores distintos de autenticação?','Senha é um fator de conhecimento; chave física é um fator de posse. Duas senhas continuam sendo o mesmo tipo de fator.','easy','own','Demonstração própria do Studify; não corresponde a uma prova oficial.','public');

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000040','10000000-0000-4000-8000-000000000004','A','Duas senhas diferentes',false);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000041','10000000-0000-4000-8000-000000000004','B','Senha e pergunta sobre o nome da mãe',false);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000042','10000000-0000-4000-8000-000000000004','C','Senha e chave física de segurança',true);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000043','10000000-0000-4000-8000-000000000004','D','PIN e outra senha',false);

insert into public.questions (id,exam_id,subject_label,topic_label,statement,explanation,difficulty,source_type,source_reference,visibility) values ('10000000-0000-4000-8000-000000000005','40000000-0000-4000-8000-000000000001','Cloud','Conceitos básicos','Um serviço aumenta e reduz os recursos conforme a demanda. Qual conceito essa descrição exemplifica?','Elasticidade é a capacidade de ajustar os recursos à demanda, aumentando ou reduzindo a capacidade.','easy','own','Demonstração própria do Studify; não corresponde a uma prova oficial.','public');

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000050','10000000-0000-4000-8000-000000000005','A','Elasticidade',true);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000051','10000000-0000-4000-8000-000000000005','B','Criptografia',false);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000052','10000000-0000-4000-8000-000000000005','C','Normalização',false);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000053','10000000-0000-4000-8000-000000000005','D','Compilação',false);

insert into public.questions (id,exam_id,subject_label,topic_label,statement,explanation,difficulty,source_type,source_reference,visibility) values ('10000000-0000-4000-8000-000000000006','40000000-0000-4000-8000-000000000001','Inglês','Passado simples','Em “She studied yesterday”, a palavra “studied” indica uma ação em qual tempo?','“Studied” é a forma do passado simples de “study”. “Yesterday” também situa a ação no passado.','easy','own','Demonstração própria do Studify; não corresponde a uma prova oficial.','public');

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000060','10000000-0000-4000-8000-000000000006','A','Presente contínuo',false);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000061','10000000-0000-4000-8000-000000000006','B','Passado simples',true);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000062','10000000-0000-4000-8000-000000000006','C','Futuro simples',false);

insert into public.question_options (id,question_id,label,text,is_correct) values ('20000000-0000-4000-8000-000000000063','10000000-0000-4000-8000-000000000006','D','Presente perfeito',false);

commit;
