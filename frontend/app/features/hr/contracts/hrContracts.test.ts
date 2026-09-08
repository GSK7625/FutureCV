import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEmployerJobsQuery,
  toJobRequest,
  validateCompanyProfile,
  validateEmployerProfile,
  validateJobForm,
} from "./hrContracts.ts";
import type { JobFormValues } from "../types/index.ts";

const validJob: JobFormValues = {
  title: "Frontend Developer",
  description: "Xây dựng giao diện FutureCV",
  requirements: "React",
  benefits: "Bảo hiểm",
  categoryId: "",
  levelId: "",
  employmentTypeId: "",
  locationId: "",
  salaryMin: "10000000",
  salaryMax: "20000000",
  salaryCurrency: "VND",
  experienceYearsMin: "1",
  experienceYearsMax: "3",
  deadline: "2026-10-01",
  positionsCount: "2",
  skills: [{ skillId: "skill-1", isRequired: true }],
};

test("builds employer job filters with backend parameter names", () => {
  assert.equal(
    buildEmployerJobsQuery({
      keyword: "React dev",
      approvalStatus: "Approved",
      isActive: false,
      pageIndex: 2,
      pageSize: 10,
    }),
    "?Keyword=React+dev&ApprovalStatus=Approved&IsActive=false&PageIndex=2&PageSize=10",
  );
});

test("rejects invalid salary range, experience range, deadline, and positions", () => {
  const errors = validateJobForm(
    {
      ...validJob,
      salaryMin: "20",
      salaryMax: "10",
      experienceYearsMin: "4",
      experienceYearsMax: "2",
      deadline: "2026-09-07",
      positionsCount: "0",
    },
    new Date("2026-09-08T00:00:00Z"),
  );

  assert.equal(errors.salaryMax, "Mức lương tối đa phải lớn hơn hoặc bằng mức tối thiểu.");
  assert.equal(errors.experienceYearsMax, "Kinh nghiệm tối đa phải lớn hơn hoặc bằng mức tối thiểu.");
  assert.equal(errors.deadline, "Hạn nộp phải ở tương lai.");
  assert.equal(errors.positionsCount, "Số lượng tuyển phải ít nhất là 1.");
});

test("maps optional numeric and identifier fields to the backend DTO", () => {
  assert.deepEqual(toJobRequest({ ...validJob, salaryMax: "", levelId: "" }), {
    title: "Frontend Developer",
    description: "Xây dựng giao diện FutureCV",
    requirements: "React",
    benefits: "Bảo hiểm",
    categoryId: null,
    levelId: null,
    employmentTypeId: null,
    locationId: null,
    salaryMin: 10000000,
    salaryMax: null,
    salaryCurrency: "VND",
    experienceYearsMin: 1,
    experienceYearsMax: 3,
    deadline: "2026-10-01T23:59:59",
    positionsCount: 2,
    skills: [{ skillId: "skill-1", isRequired: true }],
  });
});

test("validates recruiter fields exactly as the backend validator", () => {
  assert.deepEqual(
    validateEmployerProfile({ fullName: "", position: "HR", gender: "Other", phone: "123" }),
    {
      fullName: "Họ và tên là bắt buộc.",
      gender: "Giới tính không hợp lệ.",
      phone: "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.",
    },
  );
});

test("requires tax code only while creating a company and validates website URLs", () => {
  assert.deepEqual(
    validateCompanyProfile(
      { name: "FutureCV", taxCode: "", scale: "", industry: "", websiteUrl: "futurecv", address: "", description: "" },
      "create",
    ),
    {
      taxCode: "Mã số thuế là bắt buộc.",
      websiteUrl: "Website phải là một URL đầy đủ.",
    },
  );
});
