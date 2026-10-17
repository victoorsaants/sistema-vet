-- =============================================================================
-- AjuVet+ — dados de exemplo para desenvolvimento
-- Todos os nomes, documentos e contatos são fictícios (baseados no protótipo).
-- Não rodar em produção.
-- =============================================================================

insert into public.veterinarios (id, nome, crmv, especialidade, telefone, email) values
  ('10000000-0000-4000-8000-000000000001', 'Dra. Mariana Costa', 'CRMV-SE 0001', 'Clínica geral', '79999990001', 'mariana.costa@example.com'),
  ('10000000-0000-4000-8000-000000000002', 'Dr. Paulo Henrique', 'CRMV-SE 0002', 'Dermatologia', '79999990002', 'paulo.henrique@example.com');

insert into public.disponibilidades_veterinario (veterinario_id, dia_semana, hora_inicio, hora_fim)
select v.id, d.dia, h.inicio, h.fim
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid),
  ('10000000-0000-4000-8000-000000000002'::uuid)
) as v (id)
cross join generate_series(1, 5) as d (dia)
cross join (values ('08:00'::time, '12:00'::time), ('14:00'::time, '18:00'::time)) as h (inicio, fim);

insert into public.tutores (id, nome, cpf, telefone_principal, email, cep, endereco, bairro, cidade, estado, como_conheceu) values
  ('20000000-0000-4000-8000-000000000001', 'Carlos Eduardo Silva', '52998224725', '79988881234', 'carlos@example.com', '49037000', 'Rua das Palmeiras, 123 - Jardim Atlântico', 'Atalaia', 'Aracaju', 'SE', 'Indicação'),
  ('20000000-0000-4000-8000-000000000002', 'Juliana Ferreira', '11144477735', '79976543210', 'juliana@example.com', '49020000', 'Av. Beira Mar, 500', 'Treze de Julho', 'Aracaju', 'SE', 'Instagram'),
  ('20000000-0000-4000-8000-000000000003', 'Roberto Almeida', '39053344705', '79991234567', 'roberto@example.com', '49040000', 'Rua Laranjeiras, 45', 'Centro', 'Aracaju', 'SE', 'Google');

insert into public.animais (id, tutor_id, nome, especie, raca, sexo, data_nascimento, cor_pelagem, peso_kg, altura_cm, largura_cm, porte, microchip, castrado, observacoes) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Thor', 'Cão', 'Golden Retriever', 'macho', '2023-08-12', 'Dourado', 32.5, 60, 45, 'grande', '985321654987', true, 'Alergia a frango.'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Mel', 'Gato', 'SRD', 'femea', '2022-03-05', 'Tricolor', 4.2, 25, 15, 'pequeno', null, true, null),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'Luna', 'Cão', 'Border Collie', 'femea', '2021-11-20', 'Preto e branco', 18.0, 50, 30, 'medio', '985321000111', false, null);

insert into public.agendamentos (animal_id, veterinario_id, tipo, especialidade, inicio, fim, status) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'consulta', 'Clínica geral', '2026-10-14 09:30-03', '2026-10-14 10:00-03', 'confirmado'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'exame', 'Exame laboratorial', '2026-10-15 10:00-03', '2026-10-15 10:30-03', 'confirmado'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'consulta', 'Clínica geral', '2026-10-15 11:00-03', '2026-10-15 11:30-03', 'agendado');

insert into public.atendimentos (id, animal_id, veterinario_id, tipo, status, realizado_em, peso_kg, temperatura_c, frequencia_cardiaca, frequencia_respiratoria, condicao_geral, diagnostico, procedimentos, observacoes, retorno_em) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'consulta', 'finalizado', '2026-10-05 14:30-03', 32.5, 38.7, 90, 18, 'Estável', 'Dermatite alérgica leve', '{"Consulta de rotina","Exame físico"}', 'Bom estado geral. Ajuste na medicação para alergia.', '2026-11-04'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'vacinacao', 'finalizado', '2026-09-20 10:15-03', 32.0, 38.5, null, null, 'Estável', null, '{"Vacinação"}', 'Aplicada vacina V10. Sem reações.', null),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'exame', 'finalizado', '2026-08-10 16:45-03', 31.8, 38.6, null, null, 'Estável', null, '{"Coleta de material"}', 'Hemograma e bioquímico.', null);

insert into public.exames (atendimento_id, nome, status, resultado, solicitado_em, realizado_em) values
  ('40000000-0000-4000-8000-000000000003', 'Hemograma completo', 'realizado', 'Dentro da normalidade.', '2026-08-10 16:45-03', '2026-08-11 09:00-03'),
  ('40000000-0000-4000-8000-000000000003', 'Bioquímica sanguínea', 'realizado', 'Leve aumento de leucócitos, sem sinais clínicos.', '2026-08-10 16:45-03', '2026-08-11 09:00-03');

insert into public.vacinas_aplicadas (animal_id, atendimento_id, vacina, dose, aplicada_em, proxima_dose_em) values
  ('30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'V10', 'Reforço anual', '2026-09-20', '2027-09-20');

insert into public.prescricoes (id, atendimento_id, orientacoes) values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Manter o animal em repouso relativo. Retornar em 30 dias.');

insert into public.itens_prescricao (prescricao_id, medicamento, dose, frequencia, intervalo_horas, duracao_dias, via) values
  ('50000000-0000-4000-8000-000000000001', 'Amoxicilina 250 mg', '1 comprimido', 'a cada 12 horas', 12, 7, 'oral'),
  ('50000000-0000-4000-8000-000000000001', 'Meloxicam 0,5 mg', '1/2 comprimido', '1 vez ao dia', 24, 5, 'oral');

insert into public.lancamentos (tipo, categoria_id, descricao, valor, forma_pagamento, status, data_competencia, pago_em, atendimento_id, tutor_id)
select l.tipo::public.tipo_lancamento, c.id, l.descricao, l.valor, l.forma::public.forma_pagamento, 'pago'::public.status_lancamento, l.data, l.pago_em, l.atendimento_id, l.tutor_id
from (values
  ('receita', 'Consultas', 'Consulta - Thor', 120.00, 'cartao_credito', '2026-10-05'::date, '2026-10-05 15:00-03'::timestamptz, '40000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000001'::uuid),
  ('receita', 'Produtos', 'Ração Premium', 85.00, 'dinheiro', '2026-10-09', '2026-10-09 16:40-03', null, null),
  ('receita', 'Exames', 'Exame laboratorial', 180.00, 'pix', '2026-08-10', '2026-08-10 17:00-03', '40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001'),
  ('despesa', 'Medicamentos', 'Medicamento (antibiótico)', 95.00, 'cartao_debito', '2026-10-08', '2026-10-08 14:30-03', null, null),
  ('despesa', 'Folha de Pagamento', 'Salário - Veterinário', 3500.00, 'transferencia', '2026-10-08', '2026-10-08 10:15-03', null, null)
) as l (tipo, categoria, descricao, valor, forma, data, pago_em, atendimento_id, tutor_id)
join public.categorias_financeiras c on c.nome = l.categoria and c.tipo = l.tipo::public.tipo_lancamento;
