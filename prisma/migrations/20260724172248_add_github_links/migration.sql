-- CreateTable
CREATE TABLE "task_github_links" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "pr_number" INTEGER NOT NULL,
    "pr_title" TEXT NOT NULL,
    "pr_url" TEXT NOT NULL,
    "pr_state" TEXT NOT NULL,
    "branch_name" TEXT,
    "repo_full_name" TEXT NOT NULL,
    "author_github" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_github_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_github_links_task_id_pr_number_repo_full_name_key" ON "task_github_links"("task_id", "pr_number", "repo_full_name");

-- AddForeignKey
ALTER TABLE "task_github_links" ADD CONSTRAINT "task_github_links_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
