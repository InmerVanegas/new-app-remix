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
    HorizontalStack,
    Tag,
    Listbox,
    EmptySearchResult,
    Combobox,
    AutoSelection,
    Button,
    ChoiceList,
    ButtonGroup,
} from "@shopify/polaris";

import shopify from "../shopify.server";
import { ValuesOfCorrectTypeRule } from "graphql";

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
                                    percentage: configuration.percentage,
                                    vendors: configuration.vendors,
                                    option: configuration.option,
                                    optionQuantity: configuration.optionQuantity,
                                    subOptionQuantity: configuration.subOptionQuantity,
                                    minimumQuantity: configuration.minimumQuantity,
                                    maximumQuantity: configuration.maximumQuantity,
                                    optionDiscount: configuration.optionDiscount,
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
                                    percentage: configuration.percentage,
                                    vendors: configuration.vendors,
                                    option: configuration.option,
                                    optionQuantity: configuration.optionQuantity,
                                    subOptionQuantity: configuration.subOptionQuantity,
                                    minimumQuantity: configuration.minimumQuantity,
                                    maximumQuantity: configuration.maximumQuantity,
                                    optionDiscount: configuration.optionDiscount,
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
                percentage: useField("0"),
                vendors: useField([]),
                option: useField(false),
                optionQuantity: useField(false),
                subOptionQuantity: useField('Minimum Quantity'),
                minimumQuantity: useField("0"),
                maximumQuantity: useField("0"),
                optionDiscount: useField("0"),
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
                    percentage: parseFloat(form.configuration.percentage),
                    vendors: form.configuration.vendors,
                    option: form.configuration.option,
                    optionQuantity: form.configuration.optionQuantity,
                    subOptionQuantity: form.configuration.subOptionQuantity,
                    minimumQuantity: parseFloat(form.configuration.minimumQuantity),
                    maximumQuantity: parseFloat(form.configuration.maximumQuantity),
                    optionDiscount: parseFloat(form.configuration.optionDiscount),
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
                if (nextSelectedTags.size >= 3) {
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
                    <Tag key={`option-${tag}`} onRemove={removeTag(tag)} {...tags.push(tag)} {...configuration.vendors.value = tags}>
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

    const [option, setOption] = useState([false]);

    const handleOption = (valor) => {
        setOption(valor);
        configuration.option.onChange(valor[0]);
    }

    const [quantity, setQuantity] = useState([false]);

    const handleQuantity = (valor) => {
        setQuantity(valor);
        configuration.optionQuantity.onChange(valor[0]);
    }

    console.log(configuration.optionQuantity);

    const [selectedOptions, setSelectedOptions] = useState([]);

    const handleSelectChange = (selected) => {
        setSelectedOptions(selected);
        /* configuration.subOptionQuantity.onChange(selected[0]); */
        if (selected.includes("minimum") && selected.includes("maximum")) {
            configuration.subOptionQuantity.onChange("both");
        } else if (selected.includes('minimum')) {
            configuration.subOptionQuantity.onChange('minimum');
        } else if (selected.includes('maximum')) {
            configuration.subOptionQuantity.onChange('maximum');
        }
    }

    const [activeButtonIndex, setActiveButtonIndex] = useState(0);

    const handleButtonClick = useCallback(
        (index) => {
            if (activeButtonIndex === index) return;
            setActiveButtonIndex(index);
            configuration.optionDiscount.onChange(index);
            console.log('Valor del index', index);
        },
        [activeButtonIndex],
    );

    return (
        // Render a discount form using Polaris components and the discount app components
        <Page
            title="Create Custom Volumen"
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
                                <VerticalStack gap="3">
                                    <Text variant="headingMd" as="h2">
                                        Volume
                                    </Text>
                                    <TextField
                                        label="Discount percentage"
                                        autoComplete="on"
                                        {...configuration.percentage}
                                        suffix="%"
                                    />
                                </VerticalStack>
                            </Card>
                            <Card>
                                <VerticalStack gap="2">
                                    <Text variant="headingMd" as="h2">
                                        Select your Product Vendors
                                    </Text>
                                    <ChoiceList
                                        title="Select option"
                                        choices={[
                                            { label: "Incluir", value: true },
                                            { label: "Excluir", value: false },
                                        ]}
                                        selected={option}
                                        onChange={handleOption}
                                    />
                                    <Text as="p" color="subdued">
                                        Products containing the vendors you enter
                                        will receive the discount
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
                                        <p style={{ color: 'red' }}>You can only enter 3 tags</p>
                                    )}
                                    <div style={{ margin: '5px 0' }}></div>
                                    <Banner
                                        title="Products with the following vendors will have discount"
                                        status="info"
                                    ></Banner>
                                    <div style={{ margin: '5px 0' }}></div>
                                    <HorizontalStack gap="3">
                                        {verticalContentMarkup}
                                    </HorizontalStack>
                                    <Text variant="headingMd" as="h2">
                                        Set a Minimum or maximum quantity
                                    </Text>
                                    <Text as="p" color="subdued">
                                        Lorem Ipsum is simply dummy text of the printing and typesetting
                                    </Text>
                                    <ChoiceList
                                        title=""
                                        choices={[
                                            { label: 'No maximum or max quantity', value: false },
                                            { label: 'Whit maximum or max quantity', value: true },
                                        ]}
                                        selected={quantity}
                                        onChange={handleQuantity}
                                    />
                                    <ChoiceList
                                        title=""
                                        choices={[
                                            { label: 'Minimum Quantity', value: 'minimum' },
                                            { label: 'Mamimum Quantity', value: 'maximum' },
                                        ]}
                                        allowMultiple
                                        selected={selectedOptions}
                                        onChange={handleSelectChange}
                                    />
                                    <Text variant="bodySm" as="h4">
                                        Minimu
                                    </Text>
                                    <TextField
                                        label="INgrese la cantidad"
                                        {...configuration.minimumQuantity}
                                        autoComplete="on"
                                    />
                                    <Text variant="bodySm" as="h4">
                                        Maximum
                                    </Text>
                                    <TextField
                                        label="INgrese la cantidad"
                                        {...configuration.maximumQuantity}
                                        autoComplete="on"
                                    />
                                    <ButtonGroup segmented>
                                        <Button
                                            pressed={activeButtonIndex === 0}
                                            onClick={() => handleButtonClick(0)}
                                        >
                                            Percentage
                                        </Button>
                                        <Button
                                            pressed={activeButtonIndex === 1}
                                            onClick={() => handleButtonClick(1)}
                                        >
                                            Fixed Amount
                                        </Button>
                                    </ButtonGroup>
                                </VerticalStack>
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
                            <Card>
                                <Text as="p">
                                    You can learn more about different combination options here.<Button plain url="https://help.shopify.com/en/manual/discounts/combining-discounts/discount-combinations" external>Learn More</Button>
                                </Text>
                            </Card>
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
