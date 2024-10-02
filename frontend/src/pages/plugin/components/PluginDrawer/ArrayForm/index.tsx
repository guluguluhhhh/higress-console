import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Table } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { uniqueId } from 'lodash';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.css';
import i18next from 'i18next';

const EditableContext = React.createContext<FormInstance<any> | null>(null);

interface Item {
  key: string;
}

interface EditableRowProps {
  index: number;
}

const EditableRow: React.FC<EditableRowProps> = ({ index, ...props }) => {
  const [form] = Form.useForm();
  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  );
};

interface EditableCellProps {
  title: React.ReactNode;
  editable: boolean;
  children: React.ReactNode;
  dataIndex: keyof Item;
  record: Item;
  nodeType: 'select' | 'input';
  handleSave: (record: Item) => void;
}

const EditableCell: React.FC<EditableCellProps> = ({
  title,
  editable,
  children,
  dataIndex,
  nodeType,
  record,
  handleSave,
  ...restProps
}) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(true);
  const inputRef = useRef(null);
  const form = useContext(EditableContext)!;

  const matchOptions = ['PRE', 'EQUAL', 'REGULAR'].map((v) => {
    return { label: t(`route.matchTypes.${v}`), value: v };
  });

  useEffect(() => {
    form.setFieldsValue({ ...record });
  }, [editing]);

  const save = async () => {
    try {
      const values = await form.validateFields();
      handleSave({ ...record, ...values });
    } catch (errInfo) {
      console.error('Save failed: ', errInfo);
    }
  };

  let childNode = children;

  const node = <Input ref={inputRef} onPressEnter={save} onBlur={save} />

  if (editable) {
    childNode = (
      <Form.Item
        style={{ margin: 0 }}
        name={dataIndex}
        rules={[
          {
            required: true,
          },
        ]}
      >
        {node}
      </Form.Item>
    );
  }

  return <td {...restProps}>{childNode}</td>;
};

type EditableTableProps = Parameters<typeof Table>[0];

interface DataType {
  uid: number;
}

type ColumnTypes = Exclude<EditableTableProps['columns'], undefined>;

const ArrayForm: React.FC = ({ array, value, onChange }) => {
  const { t } = useTranslation();

  const initDataSource = value || [];
  for (const item of initDataSource) {
    if (!item.uid) {
      item.uid = uniqueId();
    }
  }

  const [dataSource, setDataSource] = useState<DataType[]>(value || []);

  const defaultColumns: any[] = [];
  if (array.type === 'object') {
    Object.entries(array.properties).forEach(([key, prop]) => {
      let translatedTitle = prop.title;
      if (i18next.language === "en-US" && prop.hasOwnProperty('x-title-i18n')) {
        translatedTitle = (prop['x-title-i18n'][i18next.language]) ? prop['x-title-i18n'][i18next.language] : key;
      }
      const isRequired = (array.required || []).includes(key);
      defaultColumns.push({
        title: translatedTitle,
        dataIndex: key,
        editable: true,
        required: isRequired,
      });
    });
  } else {
    defaultColumns.push({
      title: t(array.title),
      dataIndex: 'Item',
      editable: true,
    });
  }

  defaultColumns.push({
    dataIndex: 'operation',
    width: 60,
    render: (_, record: { uid: number }) =>
    (dataSource.length >= 1 ? (
      <div onClick={() => handleDelete(record.uid)}>
        <DeleteOutlined />
      </div>
    ) : null),
  });

  const handleAdd = () => {
    const newData: DataType = {
      uid: uniqueId(),
    };
    setDataSource([...dataSource, newData]);
    onChange([...dataSource, newData]);
  };

  const handleDelete = (uid: number) => {
    const newData = dataSource.filter((item) => item.uid !== uid);
    setDataSource(newData);
    onChange(newData);
  };

  const handleSave = (row: DataType) => {
    const newData = [...dataSource];
    const index = newData.findIndex((item) => row.uid === item.uid);
    const item = newData[index];
    newData.splice(index, 1, {
      ...item,
      ...row,
    });
    setDataSource(newData);
    onChange(newData);
  };

  const components = {
    body: {
      row: EditableRow,
      cell: EditableCell,
    },
  };

  const columns = defaultColumns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: DataType) => ({
        record,
        editable: col.editable,
        dataIndex: col.dataIndex,
        title: col.title,
        required: col.required,
        nodeType: col.dataIndex === 'matchType' ? 'select' : 'input',
        handleSave,
      }),
    };
  });

  return (
    <div>
      <Table
        components={components}
        size="small"
        className={styles.factor}
        dataSource={dataSource}
        columns={columns as ColumnTypes}
        pagination={false}
        rowKey={(record) => record.uid}
      />
      <Button onClick={handleAdd} type="link">
        <PlusOutlined />
      </Button>
    </div>
  );
};

export default ArrayForm;
