import React, { useEffect, useState } from "react";
import PDFPreview from "./PDFPreview";
import KeyDifferences from "./KeyDifferences";

const generateDocket = (n: number) => `IDF-${String(n).padStart(4, "0")}`;

const InventorSubmit: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<any | null>(null);
  const [docketCounter, setDocketCounter] = useState(237);
  const [assignedDocket, setAssignedDocket] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const backendBaseUrl = (import.meta as any)?.env?.VITE_BACKEND_URL || "http://localhost:3000";

  const getSignedUrl = async (name: string): Promise<{ signedUrl: string; key: string }> => {
    const res = await fetch(`${backendBaseUrl}/api/files/signed-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: name, contentType: "application/pdf" }),
    });
    if (!res.ok) throw new Error("Failed to get signed URL");
    const data = await res.json();
    const url = new URL(data.signedUrl);
    const derivedKey = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
    return { signedUrl: data.signedUrl, key: data.key || derivedKey };
  };

  const uploadWithSignedUrl = async (signedUrl: string, fileToUpload: File) => {
    const putRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: fileToUpload,
    });
    if (!putRes.ok) {
      const errText = await putRes.text();
      console.error("S3 PUT failed:", putRes.status, errText);
      throw new Error(`Failed to upload to S3 (${putRes.status})`);
    }
  };

  const extractInvention = async (key: string) => {
    const res = await fetch(`${backendBaseUrl}/api/files/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(errData.message || "Extraction failed");
    }
    return await res.json();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        onFile(file);
      }
    }
  };

  const handleDropZoneClick = () => {
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  const onFile = async (f: File | null) => {
    setFile(f);
    setUploadError(null);
    setExtractionError(null);
    setUploadedKey(null);
    setUploadedUrl(null);
    setDraft(null);
    if (!f) return;

    let key = "";
    try {
      setUploading(true);
      const { signedUrl, key: uploadedKeyValue } = await getSignedUrl(f.name);
      await uploadWithSignedUrl(signedUrl, f);
      setUploadedKey(uploadedKeyValue);
      setUploadedUrl(signedUrl.split("?")[0]);
      key = uploadedKeyValue;
    } catch (e: any) {
      setUploadError(e?.message || "Upload failed");
      setUploading(false);
      return;
    } finally {
      setUploading(false);
    }

    try {
      setExtracting(true);
      const extractionResult = await extractInvention(key);
      const invention = extractionResult.invention;

      const transformedDraft = {
        title: invention.title || "",
        description: invention.description || "",
        keyDiffs: invention.keyDifferences?.map((kd: any) => kd.statementMd) || [],
        inventors: invention.inventors || [],
        confidence: {
          title: invention.confidence.title,
          description: invention.confidence.description,
          keyDiffs: invention.confidence.keyDifferences,
          inventors: invention.confidence.inventors,
        },
        evidence: {
          title: invention.keyDifferences?.[0]?.evidenceSpans || [],
          keyDiffs: invention.keyDifferences?.flatMap((kd: any) => kd.evidenceSpans || []) || [],
        },
        deadline: null,
        scanned: false,
        rawKeyDifferences: invention.keyDifferences,
      };

      setDraft(transformedDraft);
    } catch (e: any) {
      if (e.isRelevanceError) {
        setExtractionError(`Document Not Relevant: ${e.message}`);
      } else {
        setExtractionError(e?.message || "Extraction failed");
      }
    } finally {
      setExtracting(false);
    }
  };

  const onSubmit = async () => {
    try {
      setLoading(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      const disclosureData = {
        title: form.title,
        description: form.description,
        keyDifferences: form.keyDiffs.filter(Boolean).map((diff, index) => {
          const originalData = draft?.rawKeyDifferences?.[index];
          const isFromExtraction = originalData?.statementMd === diff;

          return {
            ordinal: index + 1,
            statementMd: diff,
            ...(isFromExtraction && {
              confidence: originalData?.confidence,
              evidenceSpans: originalData?.evidenceSpans || [],
            }),
          };
        }),
        inventors: form.inventors.filter((inv) => inv.name).map((inv) => ({
          name: inv.name,
          email: inv.email,
          affiliation: inv.affiliation,
        })),
        uri: uploadedUrl,
        rawExtraction: {
          fileKey: uploadedKey,
          extractionData: draft?.rawKeyDifferences || [],
          confidenceScores: draft?.confidence || {},
          evidence: draft?.evidence || {},
        },
        ...(form.timing.public && {
          publicPlanned: true,
          publicVenue: form.timing.venue || null,
          publicDate: form.timing.date || null,
        }),
      };

      const response = await fetch(`${backendBaseUrl}/api/disclosures`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(disclosureData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to create disclosure`);
      }

      const newNo = docketCounter + 1;
      setDocketCounter(newNo);
      setAssignedDocket(generateDocket(newNo));

      setSubmitSuccess(true);
    } catch (error: any) {
      console.error("Failed to submit disclosure:", error);
      setSubmitError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const [form, setForm] = useState({
    title: "",
    description: "",
    keyDiffs: [""],
    inventors: [{ name: "", email: "", affiliation: "" }],
    context: { product: "", links: "" },
    timing: { public: false, venue: "", date: "" },
  });

  useEffect(() => {
    if (!draft) return;
    setForm({
      title: draft.title,
      description: draft.description,
      keyDiffs: draft.keyDiffs,
      inventors: draft.inventors,
      context: { product: "", links: "" },
      timing: { public: !!draft?.deadline, venue: draft?.deadline?.label || "", date: draft?.deadline?.date || "" },
    });
  }, [draft]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl shadow p-4 h-[680px] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Source Document</h2>
            <p className="text-sm text-gray-500">Preview & evidence highlighting</p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl border hover:bg-gray-50 cursor-pointer">
            <input
              id="file-input"
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] || null)}
            />
            <span className="i-[upload]" /> Upload PDF
          </label>
        </div>
        <div className="flex-1">
          {file ? (
            <div className="h-full">
              {uploading ? (
                <div className="h-full flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <div className="text-sm text-indigo-600">Uploading…</div>
                  </div>
                </div>
              ) : uploadError ? (
                <div className="h-full flex items-center justify-center bg-red-50 border border-red-200 rounded-xl">
                  <div className="text-center">
                    <div className="text-red-600 mb-2">
                      <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="text-sm text-red-700 font-medium">Upload Failed</div>
                    <div className="text-xs text-red-600 mt-1">{uploadError}</div>
                  </div>
                </div>
              ) : uploadedKey && !extractionError ? (
                <div className="h-full">
                  <PDFPreview 
                    s3Key={uploadedKey || undefined}
                    height="100%"
                    loading={extracting}
                    error={extractionError || undefined}
                    onTryDifferent={() => {
                      setFile(null);
                      setUploadedKey(null);
                      setUploadedUrl(null);
                      setDraft(null);
                      setExtractionError(null);
                    }}
                  />
                </div>
              ) : extractionError ? (
                <div className="h-full flex items-center justify-center bg-red-50 border border-red-200 rounded-xl">
                  <div className="text-center">
                    <div className="text-red-600 mb-2">
                      <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="text-sm text-red-700 font-medium">Extraction Failed</div>
                    <div className="text-xs text-red-600 mt-1">{extractionError}</div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setUploadedKey(null);
                        setUploadedUrl(null);
                        setDraft(null);
                        setExtractionError(null);
                      }}
                      className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Try Different Document
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">{file.name}</div>
                    <div className="mt-2 text-xs text-gray-400">Processing upload...</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div 
              className={`h-full flex items-center justify-center border border-dashed rounded-xl cursor-pointer transition-colors ${
                isDragOver 
                  ? 'bg-indigo-50 border-indigo-400 border-2' 
                  : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleDropZoneClick}
            >
              <div className="text-center text-gray-500 text-sm">
                {isDragOver ? (
                  <div className="text-indigo-600 font-medium">
                    Drop PDF here to upload
                  </div>
                ) : (
                  <div>
                    Drop a PDF here or click to upload
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 h-[680px] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Prefilled Disclosure</h2>
          {assignedDocket && (
            <span className="text-sm text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Assigned: {assignedDocket}
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Short, descriptive name"
            />
            {draft && (
              <div className="mt-1 text-xs text-gray-500">
                Evidence: <em>{draft.evidence.title?.[0]?.text}</em>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Explain in plain terms: problem, approach, impact (3–5 sentences)."
            />
            {draft && (
              <div className="mt-1 text-xs text-gray-500">
                Evidence: <em>{draft.evidence.description?.[0]?.text}</em>
              </div>
            )}
          </div>

          <KeyDifferences 
            keyDifferences={form.keyDiffs.map((diff, idx) => {
              const originalData = draft?.rawKeyDifferences?.[idx];
              return {
                statementMd: diff,
                ordinal: idx + 1,
                confidence: originalData?.statementMd === diff ? originalData?.confidence : undefined,
                evidenceSpans: originalData?.statementMd === diff ? originalData?.evidenceSpans : undefined,
                contrast: originalData?.statementMd === diff ? originalData?.contrast : undefined,
              };
            })}
            isEditable={true}
            onUpdate={(updated) => {
              const newKeyDiffs = updated.map((kd) => kd.statementMd || "");
              setForm({ ...form, keyDiffs: newKeyDiffs });
            }}
            showFullDetails={true}
          />

          <div>
            <label className="block text-sm font-medium">Inventors (order matters)</label>
            <div className="mt-1 space-y-2">
              {form.inventors.map((inv, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <input
                    className="col-span-4 rounded-xl border px-3 py-2"
                    placeholder="Name"
                    value={inv.name}
                    onChange={(e) => {
                      const next = [...form.inventors];
                      next[idx].name = e.target.value;
                      setForm({ ...form, inventors: next });
                    }}
                  />
                  <input
                    className="col-span-5 rounded-xl border px-3 py-2"
                    placeholder="email@company.com"
                    value={inv.email}
                    onChange={(e) => {
                      const next = [...form.inventors];
                      next[idx].email = e.target.value;
                      setForm({ ...form, inventors: next });
                    }}
                  />
                  <input
                    className="col-span-3 rounded-xl border px-3 py-2"
                    placeholder="Affiliation"
                    value={inv.affiliation}
                    onChange={(e) => {
                      const next = [...form.inventors];
                      next[idx].affiliation = e.target.value;
                      setForm({ ...form, inventors: next });
                    }}
                  />
                  <div className="col-span-12 -mt-1">
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50"
                      onClick={() => {
                        const next = form.inventors.filter((_, i) => i !== idx);
                        setForm({
                          ...form,
                          inventors: next.length > 0 ? next : [{ name: "", email: "", affiliation: "" }],
                        });
                      }}
                      aria-label="Remove inventor"
                    >
                      Remove inventor
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setForm({ ...form, inventors: [...form.inventors, { name: "", email: "", affiliation: "" }] })}
                className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
              >
                + Add inventor
              </button>
            </div>
            {draft && (
              <div className="mt-1 text-xs text-gray-500">
                Evidence: <em>{draft.evidence.inventors?.[0]?.text}</em>
              </div>
            )}
          </div>

          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3 flex items-center gap-2">
              <input
                id="public-toggle"
                type="checkbox"
                checked={form.timing.public}
                onChange={(e) => setForm({ ...form, timing: { ...form.timing, public: e.target.checked } })}
              />
              <label htmlFor="public-toggle" className="text-sm">Public disclosure planned?</label>
            </div>
            {form.timing.public && (
            <div className="col-span-5">
              <label className="block text-sm font-medium">Venue</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Conference / Blog / Demo"
                value={form.timing.venue}
                onChange={(e) => setForm({ ...form, timing: { ...form.timing, venue: e.target.value } })}
              />
            </div>
            )}
            {form.timing.public && (
            <div className="col-span-4">
              <label className="block text-sm font-medium">Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.timing.date}
                onChange={(e) => setForm({ ...form, timing: { ...form.timing, date: e.target.value } })}
              />
            </div>
            )}
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <div className="font-medium">Submission Failed</div>
              <div className="mt-1">{submitError}</div>
            </div>
          )}
          
          {submitSuccess && (
            <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
              <div className="font-medium">Disclosure Submitted Successfully!</div>
              <div className="mt-1">Your invention disclosure has been submitted for review.</div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              disabled={loading || !form.title || !form.description || form.keyDiffs.filter(Boolean).length < 2 || !form.inventors[0].email}
              onClick={onSubmit}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white disabled:bg-gray-300 shadow hover:bg-indigo-700 flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {loading ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventorSubmit;


