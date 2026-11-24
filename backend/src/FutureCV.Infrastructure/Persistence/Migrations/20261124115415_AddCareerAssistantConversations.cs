using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureCV.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCareerAssistantConversations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CareerConversations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CandidateId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CvId = table.Column<Guid>(type: "uuid", nullable: true),
                    JobId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CareerConversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CareerConversations_CVs_CvId",
                        column: x => x.CvId,
                        principalTable: "CVs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CareerConversations_Candidates_CandidateId",
                        column: x => x.CandidateId,
                        principalTable: "Candidates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CareerConversations_Jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "Jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "CareerMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Content = table.Column<string>(type: "character varying(16000)", maxLength: 16000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CareerMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CareerMessages_CareerConversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "CareerConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CareerConversations_CandidateId_IsDeleted_UpdatedAt",
                table: "CareerConversations",
                columns: new[] { "CandidateId", "IsDeleted", "UpdatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CareerConversations_CvId",
                table: "CareerConversations",
                column: "CvId");

            migrationBuilder.CreateIndex(
                name: "IX_CareerConversations_JobId",
                table: "CareerConversations",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_CareerMessages_ConversationId_CreatedAt",
                table: "CareerMessages",
                columns: new[] { "ConversationId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CareerMessages");

            migrationBuilder.DropTable(
                name: "CareerConversations");
        }
    }
}
