import React, { useState } from 'react';
import {
  ApolloProvider,
  ApolloClient,
  InMemoryCache,
  gql,
  useQuery
} from '@apollo/client';
import Box from '@mui/system/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import ExcelJS from 'exceljs';
import TextField from '@mui/material/TextField'; 
import excelImage from './excel.png';


const client = new ApolloClient({
  uri: 'https://countries.trevorblades.com/graphql',
  cache: new InMemoryCache()
});

const GET_COUNTRIES = gql`
  {
    countries {
      capital
      currency
      name
      native
      emoji
      languages {
        code
        name
      }
    }
  }
`;

function EnhancedTableHead(props) {
  const { order, orderBy, onRequestSort, headCells } = props;

  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell key={headCell.id}>
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const headCells = [
  { id: 'name', label: 'Name' },
  { id: 'native', label: 'Native' },
  { id: 'capital', label: 'Capital' },
  { id: 'languages', label: 'Languages' },
  { id: 'currency', label: 'Currency' },
 
  
];

function Countries() {
  const { loading, error, data } = useQuery(GET_COUNTRIES);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filters, setFilters] = useState({
    name: '',
    capital: '',
    currency: '',

  });

  if (loading) return <p>Loading...</p>;
  if (error) return <Alert severity="error">Error: {error.message}</Alert>;

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (event, filterKey) => {
    setFilters({ ...filters, [filterKey]: event.target.value });
  };

  const applyFilters = (country) => {
    return Object.keys(filters).every((filterKey) => {
      if (filters[filterKey] === '') return true;
      if (filterKey === 'languages') {
        const filterValue = filters[filterKey].toLowerCase();
        const countryLanguages = country.languages.map(language => language.name.toLowerCase());
        return countryLanguages.some(language => language.includes(filterValue));
      }
      if (filterKey === 'currency') {
        return country.currency && country.currency.toLowerCase().includes(filters[filterKey].toLowerCase());
      }
      if (filterKey === 'capital') {
        return country.capital && country.capital.toLowerCase().includes(filters[filterKey].toLowerCase());
      }
      return country[filterKey].toLowerCase().includes(filters[filterKey].toLowerCase());
    });
  };
  
  

  const sortedAndFilteredData = stableSort(data.countries, getComparator(order, orderBy))
    .filter(applyFilters);

  const emptyRows = rowsPerPage - Math.min(rowsPerPage, sortedAndFilteredData.length - page * rowsPerPage);

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Countries');

   
    worksheet.addRow(['Name', 'Capital', 'Currency', 'Languages', "Native"]);

   
    sortedAndFilteredData.forEach((country) => {
      const languages = country.languages.map(language => language.name).join(', ');
      worksheet.addRow([country.name, country.capital, country.currency, languages]);
    });


    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);

  
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Countries.xlsx';
    a.click();

   
    URL.revokeObjectURL(url);
  };

  return (
    <Paper>
      <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
          {headCells.map((headCell) => (
            <TextField
              key={headCell.id}
              size='small'
              label={headCell.label}
              variant="outlined"
              value={filters[headCell.id]}
              onChange={(e) => handleFilterChange(e, headCell.id)}
            />
          ))}
        </Box>
        <button style={{ border: "none", background: "none" }} onClick={exportToExcel}>
          <img src={excelImage} alt="" style={{ width: '60px', height: '50px' }} />
        </button>
      </Box>
      <TableContainer>
        <Table>
          <EnhancedTableHead
            order={order}
            orderBy={orderBy}
            onRequestSort={handleRequestSort}
            headCells={headCells}
          />
          <TableBody>
            {            sortedAndFilteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((country, index) => (
              <TableRow key={index}>
                {headCells.map((headCell) => (
                  <TableCell key={headCell.id}>
                    {headCell.id === 'languages' ? country.languages.map(language => language.name).join(', ') : country[headCell.id]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={headCells.length} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50, 100, 251]}
        component="div"
        count={sortedAndFilteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}

function App() {
  return (
    <ApolloProvider client={client}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h4" component="div" gutterBottom>
          Countries
        </Typography>
        <Countries />
      </Box>
    </ApolloProvider>
  );
}

export default App;

