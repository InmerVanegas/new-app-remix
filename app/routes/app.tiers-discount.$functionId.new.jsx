import { useEffect, useMemo, useState, useCallback } from "react";
import { json } from "@remix-run/node";
import { useForm, useField } from "@shopify/react-form";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import { CurrencyCode } from "@shopify/react-i18n";
import {
    Form,
    useActionData,
    useNavigation,
    useSubmit,
} from "@remix-run/react";
import {
    ActiveDatesCard,
    CombinationCard,
    DiscountClass,
    DiscountMethod,
    MethodCard,
    DiscountStatus,
    RequirementType,
    SummaryCard,
    UsageLimitsCard,
    onBreadcrumbAction,
} from "@shopify/discount-app-components";
import {
    Banner,
    Card,
    Text,
    Layout,
    Page,
    PageActions,
    TextField,
    VerticalStack,
    Button,
    HorizontalStack,
    Combobox,
    EmptySearchResult,
    Listbox,
    AutoSelection,
    Tag,
} from "@shopify/polaris";

import {
    DeleteMajor
} from '@shopify/polaris-icons';

import shopify from "../shopify.server";

// This is a server-side action that is invoked when the form is submitted.
// It makes an admin GraphQL request to create a discount.
export const action = async ({ params, request }) => {
    const { functionId } = params;
    const { admin } = await shopify.authenticate.admin(request);
    const formData = await request.formData();
    const {
        title,
        method,
        code,
        combinesWith,
        usageLimit,
        appliesOncePerCustomer,
        startsAt,
        endsAt,
        configuration,
    } = JSON.parse(formData.get("discount"));

    const baseDiscount = {
        functionId,
        title,
        combinesWith,
        startsAt: new Date(startsAt),
        endsAt: endsAt && new Date(endsAt),
    };

    if (method === DiscountMethod.Code) {
        const baseCodeDiscount = {
            ...baseDiscount,
            title: code,
            code,
            usageLimit,
            appliesOncePerCustomer,
        };

        const response = await admin.graphql(
            `#graphql
          mutation CreateCodeDiscount($discount: DiscountCodeAppInput!) {
            discountCreate: discountCodeAppCreate(codeAppDiscount: $discount) {
              userErrors {
                code
                message
                field
              }
            }
          }`,
            {
                variables: {
                    discount: {
                        ...baseCodeDiscount,
                        metafields: [
                            {
                                namespace: "$app:volume-discount",
                                key: "function-configuration",
                                type: "json",
                                value: JSON.stringify({
                                    quantity: configuration.quantity,
                                    percentage: configuration.percentage,
                                    tiersDiscount: configuration.tiersDiscount,
                                    percentagesDiscount: configuration.percentagesDiscount,
                                    customerTag: configuration.customerTag,
                                }),
                            },
                        ],
                    },
                },
            }
        );

        const responseJson = await response.json();
        const errors = responseJson.data.discountCreate?.userErrors;
        return json({ errors });
    } else {
        const response = await admin.graphql(
            `#graphql
          mutation CreateAutomaticDiscount($discount: DiscountAutomaticAppInput!) {
            discountCreate: discountAutomaticAppCreate(automaticAppDiscount: $discount) {
              userErrors {
                code
                message
                field
              }
            }
          }`,
            {
                variables: {
                    discount: {
                        ...baseDiscount,
                        metafields: [
                            {
                                namespace: "$app:volume-discount",
                                key: "function-configuration",
                                type: "json",
                                value: JSON.stringify({
                                    quantity: configuration.quantity,
                                    percentage: configuration.percentage,
                                    tiersDiscount: configuration.tiersDiscount,
                                    percentagesDiscount: configuration.percentagesDiscount,
                                    customerTag: configuration.customerTag,
                                }),
                            },
                        ],
                    },
                },
            }
        );

        const responseJson = await response.json();
        const errors = responseJson.data.discountCreate?.userErrors;
        return json({ errors });
    }
};

// This is the React component for the page.
export default function VolumeNew() {
    const submitForm = useSubmit();
    const actionData = useActionData();
    const navigation = useNavigation();
    const app = useAppBridge();
    const todaysDate = useMemo(() => new Date(), []);

    const isLoading = navigation.state === "submitting";
    const currencyCode = CurrencyCode.Cad;
    const submitErrors = actionData?.errors || [];
    const redirect = Redirect.create(app);

    useEffect(() => {
        if (actionData?.errors.length === 0) {
            redirect.dispatch(Redirect.Action.ADMIN_SECTION, {
                name: Redirect.ResourceType.Discount,
            });
        }
    }, [actionData]);

    const {
        fields: {
            discountTitle,
            discountCode,
            discountMethod,
            combinesWith,
            requirementType,
            requirementSubtotal,
            requirementQuantity,
            usageLimit,
            appliesOncePerCustomer,
            startDate,
            endDate,
            configuration,
        },
        submit,
    } = useForm({
        fields: {
            discountTitle: useField(""),
            discountMethod: useField(DiscountMethod.Code),
            discountCode: useField(""),
            combinesWith: useField({
                orderDiscounts: false,
                productDiscounts: false,
                shippingDiscounts: false,
            }),
            requirementType: useField(RequirementType.None),
            requirementSubtotal: useField("0"),
            requirementQuantity: useField("0"),
            usageLimit: useField(null),
            appliesOncePerCustomer: useField(false),
            startDate: useField(todaysDate),
            endDate: useField(null),
            configuration: {
                quantity: useField("0"),
                percentage: useField("0"),
                tiersDiscount: useField([]),
                percentagesDiscount: useField([]),
                customerTag: useField([]),
            },
        },
        onSubmit: async (form) => {
            const discount = {
                title: form.discountTitle,
                method: form.discountMethod,
                code: form.discountCode,
                combinesWith: form.combinesWith,
                usageLimit: form.usageLimit == null ? null : parseInt(form.usageLimit),
                appliesOncePerCustomer: form.appliesOncePerCustomer,
                startsAt: form.startDate,
                endsAt: form.endDate,
                configuration: {
                    quantity: parseInt(form.configuration.quantity),
                    percentage: parseFloat(form.configuration.percentage),
                    tiersDiscount: form.configuration.tiersDiscount,
                    percentagesDiscount: form.configuration.percentagesDiscount,
                    customerTag: form.configuration.customerTag,
                },
            };

            submitForm({ discount: JSON.stringify(discount) }, { method: "post" });

            return { status: "success" };
        },
    });

    const errorBanner =
        submitErrors.length > 0 ? (
            <Layout.Section>
                <Banner status="critical">
                    <p>There were some issues with your form submission:</p>
                    <ul>
                        {submitErrors.map(({ message, field }, index) => {
                            return (
                                <li key={`${message}${index}`}>
                                    {field.join(".")} {message}
                                </li>
                            );
                        })}
                    </ul>
                </Banner>
            </Layout.Section>
        ) : null;

    const MAX_TIERS = 5;

    const [tiers, setTiers] = useState([{ amount: '', percentage: '' }]);

    const handleAddField = () => {
        if (tiers >= MAX_TIERS) {
            alert('No se pueden agregar mas campos');
            return;
        }
        setTiers([...tiers, { amount: '', percentage: '' }]);
    }

    const handleRemoveTextField = (index) => {
        const newTiers = [...tiers];
        newTiers.splice(index, 1);
        setTiers(newTiers);
    }

    const handleTextFieldChange2 = (value, index, field) => {
        const newTiers = [...tiers];
        newTiers[index][field] = value
        setTiers(newTiers);
    }

    const handleSaveTiers = () => {
        let amounts = tiers.map((tier) => parseFloat(tier.amount));
        let percentages = tiers.map((percentage) => parseFloat(percentage.percentage));
        console.log('Valor de los montos', amounts)
        console.log('Valor de los porcentajes', percentages);
        configuration.tiersDiscount.value = amounts;
        console.log(configuration.tiersDiscount.value)
        configuration.percentagesDiscount.value = percentages;
        console.log(configuration.percentagesDiscount.value)
    }

    //Add combobox
    const [selectedTags, setSelectedTags] = useState([]);
    const [value, setValue] = useState('');
    const [suggestion, setSuggestion] = useState('');
    const [errorMesageTags, setShowErrorMessageTags] = useState(false);

    const handleActiveOptionChange = useCallback(
        (activeOption) => {
            const activeOptionIsAction = activeOption === value;

            if (!activeOptionIsAction && !selectedTags.includes(activeOption)) {
                setSuggestion(activeOption);
            } else {
                setSuggestion('');
            }
        },
        [value, selectedTags],
    );

    const updateSelection = useCallback(
        (selected) => {
            const nextSelectedTags = new Set([...selectedTags]);

            if (nextSelectedTags.has(selected)) {
                nextSelectedTags.delete(selected);
            } else {
                if (nextSelectedTags.size >= 1) {
                    setShowErrorMessageTags(true);
                    return;
                }
                nextSelectedTags.add(selected);
            }
            setSelectedTags([...nextSelectedTags]);
            setValue('');
            setSuggestion('');
            setShowErrorMessageTags(false);
        },
        [selectedTags],
    );

    const removeTag = useCallback(
        (tag) => () => {
            updateSelection(tag);
        },
        [updateSelection],
    );

    const getAllTags = useCallback(() => {
        const savedTags = ['Rustic', 'Antique', 'Vinyl', 'Vintage', 'Refurbished'];
        return [...new Set([...savedTags, ...selectedTags].sort())];
    }, [selectedTags]);

    const formatOptionText = useCallback(
        (option) => {
            const trimValue = value.trim().toLocaleLowerCase();
            const matchIndex = option.toLocaleLowerCase().indexOf(trimValue);

            if (!value || matchIndex === -1) return option;

            const start = option.slice(0, matchIndex);
            const highlight = option.slice(matchIndex, matchIndex + trimValue.length);
            const end = option.slice(matchIndex + trimValue.length, option.length);

            return (
                <p>
                    {start}
                    <Text fontWeight="bold" as="span">
                        {highlight}
                    </Text>
                    {end}
                </p>
            );
        },
        [value],
    );

    const options = useMemo(() => {
        let list;
        const allTags = getAllTags();
        const filterRegex = new RegExp(value, 'i');

        if (value) {
            list = allTags.filter((tag) => tag.match(filterRegex));
        } else {
            list = allTags;
        }

        return [...list];
    }, [value, getAllTags]);

    let tags = [];

    const verticalContentMarkup =
        selectedTags.length > 0 ? (
            <HorizontalStack gap="5">
                {selectedTags.map((tag) => (
                    <Tag key={`option-${tag}`} onRemove={removeTag(tag)} {...tags.push(tag)} {...configuration.customerTag.value = tags}>
                        {tag}
                    </Tag>
                ))}
            </HorizontalStack>
        ) : null;

    const optionMarkup =
        options.length > 0
            ? options.map((option) => {
                return (
                    <Listbox.Option
                        key={option}
                        value={option}
                        selected={selectedTags.includes(option)}
                        accessibilityLabel={option}
                    >
                        <Listbox.TextOption selected={selectedTags.includes(option)}>
                            {formatOptionText(option)}
                        </Listbox.TextOption>
                    </Listbox.Option>
                );
            })
            : null;

    const noResults = value && !getAllTags().includes(value);

    const actionMarkup = noResults ? (
        <Listbox.Action value={value}>{`Add "${value}"`}</Listbox.Action>
    ) : null;

    const emptyStateMarkup = optionMarkup ? null : (
        <EmptySearchResult
            title=""
            description={`No tags found matching "${value}"`}
        />
    );

    const listboxMarkup =
        optionMarkup || actionMarkup || emptyStateMarkup ? (
            <Listbox
                autoSelection={AutoSelection.None}
                onSelect={updateSelection}
                onActiveOptionChange={handleActiveOptionChange}
            >
                {actionMarkup}
                {optionMarkup}
            </Listbox>
        ) : null;


    return (
        // Render a discount form using Polaris components and the discount app components
        <Page
            title="Create volume discount"
            backAction={{
                content: "Discounts",
                onAction: () => onBreadcrumbAction(redirect, true),
            }}
            primaryAction={{
                content: "Save",
                onAction: submit,
                loading: isLoading,
            }}
        >
            <Layout>
                {errorBanner}
                <Layout.Section>
                    <Form method="post">
                        <VerticalStack align="space-around" gap="2">
                            <MethodCard
                                title="Volume"
                                discountTitle={discountTitle}
                                discountClass={DiscountClass.Product}
                                discountCode={discountCode}
                                discountMethod={discountMethod}
                            />
                            <Card>
                                <VerticalStack gap="2">
                                    <Text variant="headingMd" as="h2">
                                        Select the tag for the customer
                                    </Text>
                                    <Combobox
                                        allowMultiple
                                        activator={
                                            <Combobox.TextField
                                                autoComplete="off"
                                                label="Search your Vendors"
                                                labelHidden
                                                value={value}
                                                suggestion={suggestion}
                                                placeholder="Search your Vendors"
                                                onChange={setValue}
                                            />
                                        }
                                    >
                                        {listboxMarkup}
                                    </Combobox>
                                    {errorMesageTags && (
                                        <p style={{ color: 'red' }}>You can only enter 1 tag</p>
                                    )}
                                    <div style={{ margin: '5px 0' }}></div>
                                    <HorizontalStack gap="3">
                                        {verticalContentMarkup}
                                    </HorizontalStack>
                                </VerticalStack>
                            </Card>
                            <Card>
                                {/* <br /> */}
                                {tiers.map((tier, index) => (
                                    <HorizontalStack key={index} gap="2">
                                        <TextField
                                            label={`Enter the amount for the tier ${index + 1}`}
                                            value={tier.amount}
                                            onChange={val => handleTextFieldChange2(val, index, 'amount')}
                                            prefix="$"
                                        />
                                        <TextField
                                            label={`Enter the percentage for the tier ${index + 1}`}
                                            value={tier.percentage}
                                            onChange={val => handleTextFieldChange2(val, index, 'percentage')}
                                            suffix="%"
                                        />
                                        {tiers.length > 1 && (
                                            <Button
                                                destructive
                                                onClick={() => handleRemoveTextField(index)}
                                                icon={DeleteMajor}
                                            >
                                                Delete Tier
                                            </Button>
                                        )}
                                    </HorizontalStack>
                                ))}
                                <div style={{ margin: '5px 0' }}></div>
                                <VerticalStack>
                                    {tiers.length < MAX_TIERS && (
                                        <Button primary onClick={handleAddField}>Add Tier</Button>
                                    )}
                                </VerticalStack>
                                <Button onClick={handleSaveTiers}>Ver datos</Button>
                            </Card>
                            {discountMethod.value === DiscountMethod.Code && (
                                <UsageLimitsCard
                                    totalUsageLimit={usageLimit}
                                    oncePerCustomer={appliesOncePerCustomer}
                                />
                            )}
                            <CombinationCard
                                combinableDiscountTypes={combinesWith}
                                discountClass={DiscountClass.Product}
                                discountDescriptor={"Discount"}
                            />
                            <ActiveDatesCard
                                startDate={startDate}
                                endDate={endDate}
                                timezoneAbbreviation="EST"
                            />
                        </VerticalStack>
                    </Form>
                </Layout.Section>
                <Layout.Section secondary>
                    <SummaryCard
                        header={{
                            discountMethod: discountMethod.value,
                            discountDescriptor:
                                discountMethod.value === DiscountMethod.Automatic
                                    ? discountTitle.value
                                    : discountCode.value,
                            appDiscountType: "Volume",
                            isEditing: false,
                        }}
                        performance={{
                            status: DiscountStatus.Scheduled,
                            usageCount: 0,
                            isEditing: false,
                        }}
                        minimumRequirements={{
                            requirementType: requirementType.value,
                            subtotal: requirementSubtotal.value,
                            quantity: requirementQuantity.value,
                            currencyCode: currencyCode,
                        }}
                        usageLimits={{
                            oncePerCustomer: appliesOncePerCustomer.value,
                            totalUsageLimit: usageLimit.value,
                        }}
                        activeDates={{
                            startDate: startDate.value,
                            endDate: endDate.value,
                        }}
                    />
                </Layout.Section>
                <Layout.Section>
                    <PageActions
                        primaryAction={{
                            content: "Save discount",
                            onAction: submit,
                            loading: isLoading,
                        }}
                        secondaryActions={[
                            {
                                content: "Discard",
                                onAction: () => onBreadcrumbAction(redirect, true),
                            },
                        ]}
                    />
                </Layout.Section>
            </Layout>
        </Page>
    );
}
