import React from "react";
import Section_a from "./AllTask/Section_a";
import MainLayout from "../components/MainLayout";

const AllTask = () => {
  return (
    <MainLayout noPadding={true}>
      <Section_a />
    </MainLayout>
  );
};

export default AllTask;
