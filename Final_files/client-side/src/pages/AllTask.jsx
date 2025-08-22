import React, { useEffect } from "react";
import Section_a from "./AllTask/Section_a";
import MainLayout from "../components/MainLayout";

const AllTask = () => {
  useEffect(() => {
    // Tell sidebar to clear task badge when AllTask is opened
    const evt = new CustomEvent("notifications:categoryRead", { detail: { category: "tasks" } });
    window.dispatchEvent(evt);
  }, []);

  return (
    <MainLayout noPadding={true}>
      <Section_a />
    </MainLayout>
  );
};

export default AllTask;
