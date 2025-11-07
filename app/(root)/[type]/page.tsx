import React from "react";
import Sort from "@/components/Sort";
import { getFiles, getTotalSpaceUsed } from "@/lib/actions/file.actions";
import {
  convertFileSize,
  getFileTypesParams,
  getUsageSummary,
} from "@/lib/utils";
import { Models } from "node-appwrite";
import Card from "@/components/Card";

const Page = async ({
  params,
  searchParams,
}: {
  params: { type: string };
  searchParams: { query?: string; sort?: string };
}) => {
  const type = ((await params)?.type as string) || "";
  const searchText = ((await searchParams)?.query as string) || "";
  const sort = ((await searchParams)?.sort as string) || "";

  const types = getFileTypesParams(type) as FileType[];

  const [files, totalSpace] = await Promise.all([
    getFiles({ types: [], limit: 10 }),
    getTotalSpaceUsed(),
  ]);
  const usageSummary = getUsageSummary(totalSpace);

  return (
    <div className="page-container">
      <section className="w-full">
        <h1 className="h1 captalize">{type}</h1>

        <div className="total-size-section">
          {usageSummary
            .filter((summary) => summary.title.toLowerCase() === type)
            .map((summary) => (
              <p key={summary.title} className="body-1">
                Total:{" "}
                <span className="h5">{convertFileSize(summary.size)}</span>
              </p>
            ))}

          <div className="sort-container">
            <p className="body-1 hidden text-light-200 sm:block">Sort by:</p>
            <Sort />
          </div>
        </div>
      </section>
      {/* Render the files */}
      {files.total > 0 ? (
        <section className="file-list">
          {files.rows.map((file: Models.Row) => (
            <Card key={file.$id} file={file} />
          ))}
        </section>
      ) : (
        <p className="empty-list">No files uploaded</p>
      )}
    </div>
  );
};
export default Page;
