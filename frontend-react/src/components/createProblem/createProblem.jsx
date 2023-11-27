import { useState, useEffect, useRef } from "react";
import createProblem from "./createProblem.js";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export default function CreateProblem({ fetchProblems, problems }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState(null);
  const [difficulty, setDifficulty] = useState("");
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);

  async function handleCreateProblem() {
    try {
      setUploading(true);
      await createProblem(title, description, files, difficulty);
      setTitle("");
      setDifficulty("");
      setDescription("");
      setFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Poll for new problems until the new problem is in the list
      const oldProblems = problems;
      const intervalId = setInterval(async () => {
        await fetchProblems();
        if (problems.length > oldProblems.length) {
          // If the new problem is in the list, stop polling
          clearInterval(intervalId);
        }
      }, 1000);
    } catch (error) {
      alert("An error occurred while creating the problem.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      id="createProblemSection"
      className="bg-white p-8 rounded-lg shadow-md mb-6"
      onSubmit={handleCreateProblem}
    >
      <h2 className="text-2xl mb-4">Create a New Problem</h2>
      <input
        id="problemTitle"
        type="text"
        placeholder="Problem Title"
        className="border p-2 rounded mb-4 w-full"
        onChange={(e) => setTitle(e.target.value)}
        value={title}
        required
      />

      <ReactQuill
        style={{ height: "300px", marginBottom: "60px" }}
        placeholder="Problem Description"
        onChange={setDescription}
        value={description}
        required
      ></ReactQuill>

      <input
        id="problemDifficulty"
        type="text"
        placeholder="Difficulty (e.g., easy, medium, hard)"
        className="border p-2 rounded mb-4 w-full"
        onChange={(e) => setDifficulty(e.target.value)}
        value={difficulty}
        required
      />

      <label className="block text-gray-700 mb-2">
        Import Test Cases (CSV format: input,expected_output):
      </label>
      <input
        type="file"
        id="csvUpload"
        accept=".csv"
        className="border p-2 rounded mb-4 w-full"
        onChange={(e) => setFiles(e.target.files[0])}
        ref={fileInputRef}
        required
      />
      <button
        className={`bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 ${
          (uploading || !title || !description || !files || !difficulty) &&
          "opacity-50 cursor-not-allowed"
        }`}
      >
        Create Problem
      </button>
    </form>
  );
}
