import React from "react";
import styled from "styled-components";
import { rgba } from "~/renderer/styles/helpers";
import Button from "~/renderer/components/Button";
import TextBase from "~/renderer/components/Text";

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  background-color: ${p => rgba(p.theme.colors.palette.primary.main, 0.1)};
  color: ${p => p.theme.colors.palette.primary.main};
  column-gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 4px;
  align-items: center;
`;
const Text = styled(TextBase).attrs(() => ({
  ff: "Inter",
  fontSize: "0.875rem",
  fontWeight: 500,
  lineHeight: "1.4",
}))`
  &:first-letter {
    text-transform: uppercase;
  }
`;
const TextWrappper = styled.div`
  max-width: 28rem;
`;
const ButtonAddAccount = styled(Button).attrs(() => ({
  primary: true,
  small: true,
}))`
  height: 40px;
`;

type SectionInformativeProps = {
  message: string;
  ctaLabel: string;
  onClick: () => void;
};

const SectionInformative = ({ message, ctaLabel, onClick }: SectionInformativeProps) => (
  <Container>
    <TextWrappper>
      <Text>{message}</Text>
    </TextWrappper>
    <ButtonAddAccount onClick={onClick} data-test-id="add-destination-account-button">
      {ctaLabel}
    </ButtonAddAccount>
  </Container>
);

export default SectionInformative;
