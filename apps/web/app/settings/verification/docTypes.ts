/**
 * 在籍確認で受け付ける書類（表示用定義）。
 * 'use client' を付けないプレーンなモジュールにして、Server Component（page.tsx）と
 * Client Component（VerificationForm.tsx）の両方から import できるようにする。
 */
export const ENROLLMENT_DOCS = [
  {
    value: 'enrollment_certificate',
    label: '入学証明書・在籍証明書',
    hint: '大学が発行する Enrollment / Admission Letter、在籍証明書。氏名・学校名・年度が読めるもの',
  },
  {
    value: 'student_id',
    label: '学生証',
    hint: '有効期限内のもの。氏名・学校名・写真面。学籍番号はマスクして構いません',
  },
  {
    value: 'diploma',
    label: '卒業証書・学位記（アルムナイ）',
    hint: '卒業した方向け。Diploma / Degree Certificate。氏名・学校名・学位・年月が読めるもの',
  },
  {
    value: 'other',
    label: 'その他',
    hint: '成績証明書・合格通知など。補足欄に書類名を明記してください',
  },
] as const;

export type EnrollmentDocType = (typeof ENROLLMENT_DOCS)[number]['value'];
