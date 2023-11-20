import { Card, Stack, Switch, Text, Title } from '@mantine/core';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import { ManageLayout } from '~/components/layout/Templates/ManageLayout';
import { getServerAuthSession } from '~/server/auth';
import { getServerSideTranslations } from '~/tools/server/getServerSideTranslations';
import { checkForSessionOrAskForLogin } from '~/tools/server/loginBuilder';
import { manageNamespaces } from '~/tools/server/translation-namespaces';

const GeneralSettingsPage = () => {
  const { t } = useTranslation('manage/generalSettings');

  const metaTitle = `${t('metaTitle')} • Homarr`;

  return (
    <ManageLayout>
      <Head>
        <title>{metaTitle}</title>
      </Head>

      <Title>{t('pageTitle')}</Title>
      <Text mb="lg">{t('pageDescription')}</Text>

      <Stack>
        <Card>
          <Title order={2}>{t('settings.analytics.title')}</Title>
          <Switch mb="sm" label={t('settings.analytics.label')} />
        </Card>
      </Stack>
    </ManageLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession({ req: context.req, res: context.res });
  const result = checkForSessionOrAskForLogin(
    context,
    session,
    () => session?.user.isAdmin == true
  );
  if (result) {
    return result;
  }

  const translations = await getServerSideTranslations(
    [...manageNamespaces, 'layout/manage', 'tools/docker'],
    context.locale,
    context.req,
    context.res
  );

  return {
    props: {
      ...translations,
    },
  };
};

export default GeneralSettingsPage;
